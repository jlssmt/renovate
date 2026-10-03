import { parseUrl } from "../../../../util/url.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../../datasource/github-tags/index.js";
import { HomebrewUrlHandler } from "./base.js";
import is from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/manager/homebrew/handlers/github.ts
var GitHubUrlHandler = class extends HomebrewUrlHandler {
	type = "github";
	parseUrl(urlStr) {
		if (!is.nonEmptyString(urlStr)) return null;
		const url = parseUrl(urlStr);
		if (url?.hostname !== "github.com") return null;
		let s = url.pathname.split("/");
		s = s.filter((val) => val);
		const ownerName = s[0];
		const repoName = s[1];
		let currentValue;
		let urlType;
		if (s[2] === "archive") {
			urlType = "archive";
			currentValue = s[3];
			if (currentValue === "refs") currentValue = s[5];
			if (currentValue.slice(currentValue.length - 7, currentValue.length) === ".tar.gz") currentValue = currentValue.substring(0, currentValue.length - 7);
		} else if (s[2] === "releases" && s[3] === "download") {
			urlType = "releases";
			currentValue = s[4];
		}
		if (!currentValue || !urlType) return null;
		return {
			type: "github",
			currentValue,
			ownerName,
			repoName,
			urlType
		};
	}
	createDependency(parsed, sha256, url) {
		return {
			depName: `${parsed.ownerName}/${parsed.repoName}`,
			currentValue: parsed.currentValue,
			datasource: parsed.urlType === "releases" ? GithubReleasesDatasource.id : GithubTagsDatasource.id,
			managerData: {
				type: "github",
				ownerName: parsed.ownerName,
				repoName: parsed.repoName,
				sha256,
				url
			}
		};
	}
	buildArchiveUrls(managerData, newVersion) {
		const ownerName = managerData.ownerName;
		const repoName = managerData.repoName;
		return [`https://github.com/${ownerName}/${repoName}/releases/download/${newVersion}/${repoName}-${semver.coerce(newVersion)?.version ?? newVersion}.tar.gz`, `https://github.com/${ownerName}/${repoName}/archive/refs/tags/${newVersion}.tar.gz`];
	}
};
//#endregion
export { GitHubUrlHandler };

//# sourceMappingURL=github.js.map