import { regEx } from "../../util/regex.js";
import { isHttpUrl, parseUrl, trimTrailingSlash } from "../../util/url.js";
import { hosts } from "../../util/host-rules.js";
import { detectPlatform } from "../../util/common.js";
import { asTimestamp } from "../../util/timestamp.js";
import { parseGitUrl } from "../../util/git/url.js";
import { manualChangelogUrls, manualSourceUrls } from "./metadata-manual.js";
import { isEmptyString, isNullOrUndefined, isString, isUndefined } from "@sindresorhus/is";
import parse from "github-url-from-git";
//#region lib/modules/datasource/metadata.ts
const githubPages = regEx("^https://([^.]+).github.com/([^/]+)$");
const gitPrefix = regEx("^git:/?/?");
function massageUrl(sourceUrl) {
	const massagedUrl = massageGitAtUrl(sourceUrl);
	if (!parseUrl(massagedUrl)) return "";
	if (detectPlatform(massagedUrl) === "gitlab") return massageGitlabUrl(sourceUrl);
	return massageGithubUrl(sourceUrl);
}
function massageGithubUrl(url) {
	return massageGitAtUrl(url).replace("http:", "https:").replace("http+git:", "https:").replace("https+git:", "https:").replace("ssh://git@", "https://").replace(gitPrefix, "https://").replace(githubPages, "https://github.com/$1/$2").replace("www.github.com", "github.com").split("/").slice(0, 5).join("/");
}
function massageGitlabUrl(url) {
	return massageGitAtUrl(url).replace("http:", "https:").replace(gitPrefix, "https://").replace(regEx(/\/tree\/.*$/i), "").replace(regEx(/\/$/i), "").replace(regEx(/\.git$/i), "");
}
function massageGitAtUrl(url) {
	let massagedUrl = url;
	if (url.startsWith("git@")) massagedUrl = url.replace(":", "/").replace("git@", "https://");
	return massagedUrl;
}
function massageTimestamps(dep) {
	for (const release of dep.releases || []) {
		let { releaseTimestamp } = release;
		delete release.releaseTimestamp;
		releaseTimestamp = asTimestamp(releaseTimestamp);
		if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
	}
}
function addMetaData(dep, datasource, packageName) {
	massageTimestamps(dep);
	const packageNameLowercase = packageName.toLowerCase();
	const manualChangelogUrl = manualChangelogUrls[datasource]?.[packageNameLowercase];
	if (manualChangelogUrl) dep.changelogUrl = manualChangelogUrl;
	const manualSourceUrl = manualSourceUrls[datasource]?.[packageNameLowercase];
	if (manualSourceUrl) dep.sourceUrl = manualSourceUrl;
	if (dep.sourceUrl && !dep.sourceDirectory) try {
		const parsed = parseGitUrl(dep.sourceUrl);
		if (parsed.filepathtype === "tree" && parsed.filepath !== "") {
			dep.sourceUrl = parsed.toString();
			dep.sourceDirectory = parsed.filepath;
		}
	} catch {}
	if (!dep.sourceUrl && dep.changelogUrl && detectPlatform(dep.changelogUrl) === "github") dep.sourceUrl = dep.changelogUrl;
	if (!dep.sourceUrl && dep.homepage) {
		const platform = detectPlatform(dep.homepage);
		if (platform === "github" || platform === "gitlab") dep.sourceUrl = dep.homepage;
	}
	const extraBaseUrls = [];
	// istanbul ignore next
	hosts({ hostType: "github" }).forEach((host) => {
		extraBaseUrls.push(host, `gist.${host}`);
	});
	extraBaseUrls.push("gitlab.com");
	if (dep.sourceUrl) {
		const massagedUrl = massageUrl(dep.sourceUrl);
		if (isEmptyString(massagedUrl)) delete dep.sourceUrl;
		else {
			dep.sourceUrl = parse(massagedUrl, { extraBaseUrls }) || dep.sourceUrl;
			if (!isHttpUrl(dep.sourceUrl) && detectPlatform(massagedUrl) === "gitlab") dep.sourceUrl = massagedUrl;
		}
	}
	if (shouldDeleteHomepage(dep.sourceUrl, dep.homepage)) delete dep.homepage;
	for (const urlKey of [
		"homepage",
		"sourceUrl",
		"changelogUrl",
		"dependencyUrl"
	]) {
		const urlVal = dep[urlKey];
		if (isString(urlVal) && isHttpUrl(urlVal.trim())) dep[urlKey] = urlVal.trim();
		else delete dep[urlKey];
	}
}
/**
* Returns true if
* 1. it's a github or gitlab url and not a path within the repo.
* 2. it's equal to sourceURl
* @param sourceUrl
* @param homepage
*/
function shouldDeleteHomepage(sourceUrl, homepage) {
	if (isNullOrUndefined(sourceUrl) || isUndefined(homepage)) return false;
	const massagedSourceUrl = massageUrl(sourceUrl);
	const platform = detectPlatform(homepage);
	if (platform === "github" || platform === "gitlab") {
		const sourceUrlParsed = parseUrl(massagedSourceUrl);
		if (isNullOrUndefined(sourceUrlParsed)) return false;
		const homepageParsed = parseUrl(homepage);
		return homepageParsed !== null && trimTrailingSlash(homepageParsed.pathname) === trimTrailingSlash(sourceUrlParsed.pathname);
	}
	return massagedSourceUrl === homepage;
}
//#endregion
export { addMetaData, massageGithubUrl, massageGitlabUrl, massageUrl, shouldDeleteHomepage };

//# sourceMappingURL=metadata.js.map