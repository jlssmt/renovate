import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { parseUrl } from "../../../../util/url.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { HomebrewUrlHandler } from "./base.js";
import is from "@sindresorhus/is";
//#region lib/modules/manager/homebrew/handlers/npm.ts
var NpmUrlHandler = class extends HomebrewUrlHandler {
	type = "npm";
	parseUrl(urlStr) {
		if (!is.nonEmptyString(urlStr)) {
			logger.debug({ urlStr }, "Invalid URL string");
			return null;
		}
		const url = parseUrl(urlStr);
		if (url?.hostname !== "registry.npmjs.org") {
			logger.once.debug({ hostname: url?.hostname }, "Homebrew only support NPM packages hosted on registry.npmjs.org");
			return null;
		}
		const match = regEx(/^\/(?<packageName>(?:@[^/]+\/)?[^/]+)\/-\/[^/]+-(?<version>[\d.]+(?:-[a-zA-Z0-9.-]*)?)\.tgz$/).exec(url.pathname);
		const version = match?.groups?.version;
		const packageName = match?.groups?.packageName;
		if (!packageName || !version) {
			logger.debug({ pathname: url.pathname }, "Path does not contain a valid NPM package name or version");
			return null;
		}
		return {
			type: "npm",
			currentValue: version,
			packageName
		};
	}
	createDependency(parsed, sha256, url) {
		return {
			depName: parsed.packageName,
			currentValue: parsed.currentValue,
			datasource: NpmDatasource.id,
			managerData: {
				type: "npm",
				packageName: parsed.packageName,
				sha256,
				url
			}
		};
	}
	buildArchiveUrls(managerData, newVersion) {
		const { packageName } = managerData;
		return [`https://registry.npmjs.org/${packageName}/-/${packageName.includes("/") ? packageName.split("/")[1] : packageName}-${newVersion}.tgz`];
	}
};
//#endregion
export { NpmUrlHandler };

//# sourceMappingURL=npm.js.map