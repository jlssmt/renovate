import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { findLocalSiblingOrParent, readLocalFile } from "../../../util/fs/index.js";
import { parseNpmrc, renderNpmrc } from "./npmrc-parser.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/manager/npm/npmrc.ts
/**
* Mirrors npm's environment-reference grammar. Escape handling remains
* procedural because RE2 does not support lookbehind.
*/
const environmentVariableReferenceRegex = regEx(/\$\{([^${}?]+)(\?)?\}/g);
function containsEnvironmentVariableReference(value) {
	if (!isString(value)) return false;
	for (const match of value.matchAll(environmentVariableReferenceRegex)) {
		let escapeCount = 0;
		let escapeIndex = match.index - 1;
		while (value[escapeIndex] === "\\") {
			escapeCount += 1;
			escapeIndex -= 1;
		}
		if (escapeCount % 2 === 0) return true;
	}
	return false;
}
function hasEnvironmentVariableReference(line) {
	return containsEnvironmentVariableReference(line.key) || containsEnvironmentVariableReference(line.value);
}
function sanitizeRepoNpmrc(repoNpmrc, npmrcFileName) {
	const document = parseNpmrc(repoNpmrc);
	const retainedLines = [];
	const allowEnvironmentVariableReferences = GlobalConfig.get("exposeAllEnv");
	let removedEnvironmentVariableReferenceLine = false;
	let removedPackageLockSetting = false;
	for (const line of document.lines) {
		if (line.type !== "setting" || line.section !== null) {
			retainedLines.push(line);
			continue;
		}
		if (line.key === "package-lock") {
			removedPackageLockSetting = true;
			continue;
		}
		if (!allowEnvironmentVariableReferences && hasEnvironmentVariableReference(line)) {
			removedEnvironmentVariableReferenceLine = true;
			continue;
		}
		retainedLines.push(line);
	}
	if (removedPackageLockSetting) logger.debug("Stripping package-lock setting from .npmrc");
	if (removedEnvironmentVariableReferenceLine) logger.debug({ npmrcFileName }, "Stripping .npmrc file of lines with variables");
	return {
		content: renderNpmrc(retainedLines),
		detectedLineEnding: document.detectedLineEnding
	};
}
function mergeNpmrcDocuments(configNpmrc, sanitizedRepoNpmrc) {
	if (!configNpmrc) return sanitizedRepoNpmrc.content;
	const configDocument = parseNpmrc(configNpmrc);
	if (configDocument.trailingLineEnding) return `${configNpmrc}${sanitizedRepoNpmrc.content}`;
	return `${configNpmrc}${configDocument.detectedLineEnding ?? sanitizedRepoNpmrc.detectedLineEnding ?? "\n"}${sanitizedRepoNpmrc.content}`;
}
/**
* Combines the configured `npmrc` with the sanitized repository `.npmrc`, honouring `npmrcMerge`.
*
* @returns the `npmrc` to use for the package file, or `undefined` when there is neither
*/
function applyConfigNpmrc(config, repoNpmrc, npmrcFileName) {
	if (!repoNpmrc) return isString(config.npmrc) ? config.npmrc : void 0;
	if (isString(config.npmrc) && !config.npmrcMerge) {
		logger.info({ npmrcFileName }, "Repo .npmrc file is ignored due to config.npmrc with config.npmrcMerge=false");
		return config.npmrc;
	}
	return mergeNpmrcDocuments(config.npmrc, repoNpmrc);
}
async function resolveNpmrc(packageFile, config) {
	const npmrcFileName = await findLocalSiblingOrParent(packageFile, ".npmrc");
	if (!npmrcFileName) return {
		npmrc: applyConfigNpmrc(config, void 0),
		npmrcFileName
	};
	const repoNpmrcContent = await readLocalFile(npmrcFileName, "utf8");
	if (!isString(repoNpmrcContent)) return {
		npmrc: void 0,
		npmrcFileName
	};
	return {
		npmrc: applyConfigNpmrc(config, sanitizeRepoNpmrc(repoNpmrcContent, npmrcFileName), npmrcFileName),
		npmrcFileName
	};
}
//#endregion
export { applyConfigNpmrc, resolveNpmrc };

//# sourceMappingURL=npmrc.js.map