import { logger } from "../../../logger/index.js";
import { deleteLocalFile, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { PackageJson } from "./schema.js";
import upath from "upath";
import detectIndent from "detect-indent";
//#region lib/modules/manager/npm/utils.ts
function parseLockFile(lockFile) {
	const detectedIndent = detectIndent(lockFile).indent || "  ";
	let lockFileParsed;
	try {
		lockFileParsed = JSON.parse(lockFile);
	} catch (err) {
		logger.warn({ err }, "Error parsing npm lock file");
	}
	return {
		detectedIndent,
		lockFileParsed
	};
}
function composeLockFile(lockFile, indent) {
	return `${JSON.stringify(lockFile, null, indent)}\n`;
}
async function getNpmrcContent(dir) {
	const npmrcFilePath = upath.join(dir, ".npmrc");
	let originalNpmrcContent = null;
	try {
		originalNpmrcContent = await readLocalFile(npmrcFilePath, "utf8");
	} catch {
		/* v8 ignore next -- needs test */
		originalNpmrcContent = null;
	}
	if (originalNpmrcContent) logger.debug(`npmrc file ${npmrcFilePath} found in repository`);
	return originalNpmrcContent;
}
async function updateNpmrcContent(dir, originalContent, additionalLines) {
	const npmrcFilePath = upath.join(dir, ".npmrc");
	const newNpmrc = originalContent ? [originalContent, ...additionalLines] : additionalLines;
	try {
		const newContent = newNpmrc.length ? newNpmrc.join("\n") : null;
		if (newContent !== originalContent) {
			logger.debug(`Writing updated .npmrc file to ${npmrcFilePath}`);
			await writeLocalFile(npmrcFilePath, `${newContent}\n`);
		}
	} catch /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn("Unable to write custom npmrc file");
	}
}
async function resetNpmrcContent(dir, originalContent) {
	const npmrcFilePath = upath.join(dir, ".npmrc");
	if (originalContent) try {
		await writeLocalFile(npmrcFilePath, originalContent);
	} catch /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn("Unable to reset npmrc to original contents");
	}
	else try {
		await deleteLocalFile(npmrcFilePath);
	} catch /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn("Unable to delete custom npmrc");
	}
}
/**
* Add the host-rule lines to the `.npmrc` in `dir`, run `fn`, and restore the original `.npmrc` afterwards.
*
* The restore runs in a `finally`, so a package manager that throws cannot leave the injected credentials behind in the working tree.
*/
async function withNpmrcHostRules(dir, additionalLines, fn) {
	const originalContent = await getNpmrcContent(dir);
	await updateNpmrcContent(dir, originalContent, additionalLines);
	try {
		return await fn(originalContent);
	} finally {
		await resetNpmrcContent(dir, originalContent);
	}
}
async function loadPackageJson(parentDir) {
	const json = await readLocalFile(upath.join(parentDir, "package.json"), "utf8");
	const res = PackageJson.safeParse(json);
	if (res.success) return res.data;
	return {};
}
//#endregion
export { composeLockFile, getNpmrcContent, loadPackageJson, parseLockFile, resetNpmrcContent, updateNpmrcContent, withNpmrcHostRules };

//# sourceMappingURL=utils.js.map