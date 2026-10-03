import { logger } from "../../../logger/index.js";
import { hashStream } from "../../../util/hash.js";
import { Http } from "../../../util/http/index.js";
import { findHandlerByType } from "./handlers/index.js";
import { updateRubyString } from "./utils.js";
//#region lib/modules/manager/homebrew/update.ts
const http = new Http("homebrew");
async function updateDependency({ fileContent, upgrade }) {
	const { packageFile, depName } = upgrade;
	logger.trace("updateDependency()");
	const { managerData, newValue } = upgrade;
	if (!managerData?.url || !managerData.sha256 || !newValue) {
		logger.debug({
			packageFile,
			depName
		}, `Missing data`);
		return fileContent;
	}
	const handler = findHandlerByType(managerData.type);
	if (!handler) {
		logger.debug({
			packageFile,
			depName
		}, `Unknown handler type ${managerData.type}`);
		return fileContent;
	}
	if (!handler.parseUrl(managerData.url)) {
		logger.debug({
			packageFile,
			depName
		}, `Failed to parse old URL '${managerData.url}'`);
		return fileContent;
	}
	const candidateUrls = [];
	const buildArchiveUrls = handler.buildArchiveUrls(managerData, newValue);
	if (!buildArchiveUrls) {
		logger.debug({
			packageFile,
			depName
		}, `Failed to build new URL`);
		return fileContent;
	}
	candidateUrls.push(...buildArchiveUrls);
	let newUrl = null;
	let newSha256 = null;
	for (const candidateUrl of candidateUrls) {
		const newParsed = handler.parseUrl(candidateUrl);
		if (!newParsed || newParsed?.currentValue !== newValue) {
			logger.debug({
				packageFile,
				depName
			}, `URL validation failed for '${candidateUrl}'`);
			continue;
		}
		try {
			newSha256 = await hashStream(http.stream(candidateUrl), "sha256");
			newUrl = candidateUrl;
			logger.trace({
				packageFile,
				depName
			}, `Successfully downloaded '${candidateUrl}'`);
			break;
		} catch {
			logger.debug({
				packageFile,
				depName
			}, `Failed to download ${candidateUrl}`);
		}
	}
	if (!newUrl || !newSha256) {
		logger.debug({
			packageFile,
			depName
		}, `All download attempts failed`);
		return fileContent;
	}
	let newContent = updateRubyString(fileContent, "url", managerData.url, newUrl);
	if (!newContent) {
		logger.debug({
			packageFile,
			depName
		}, `Failed to update URL`);
		return fileContent;
	}
	newContent = updateRubyString(newContent, "sha256", managerData.sha256, newSha256);
	if (!newContent) {
		logger.debug({
			packageFile,
			depName
		}, `Failed to update SHA256`);
		return fileContent;
	}
	return newContent;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map