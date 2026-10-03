import { logger } from "../../../logger/index.js";
import { getSiblingFileName, localPathIsFile, readLocalFile } from "../../../util/fs/index.js";
import { collectPackageJson } from "./compat.js";
import { DenoExtract, ImportMapExtract } from "./schema.js";
import { postExtract } from "./post.js";
import { isObject } from "@sindresorhus/is";
import upath from "upath";
//#region lib/modules/manager/deno/extract.ts
async function extractAllPackageFiles(config, matchedFiles) {
	const packageFiles = [];
	for (const matchedFile of matchedFiles) {
		if (upath.basename(matchedFile) === "deno.lock") {
			const extracted = await collectPackageJson(matchedFile);
			if (extracted) packageFiles.push(...extracted);
		}
		if (upath.basename(matchedFile).startsWith("deno.json")) {
			const content = await readLocalFile(matchedFile, "utf8");
			const res = DenoExtract.safeParse({
				content,
				fileName: matchedFile
			});
			if (!res.success) {
				logger.debug({
					matchedFile,
					err: res.error
				}, "Deno: extract failed");
				continue;
			}
			const result = await processDenoExtract(res.data);
			packageFiles.push(...result);
		}
	}
	await postExtract(packageFiles);
	return packageFiles;
}
async function getLockFiles(lock, fileName) {
	let lockFile;
	if (lock && await localPathIsFile(lock)) lockFile = lock;
	if (!lockFile) {
		const siblingLockFile = getSiblingFileName(fileName, "deno.lock");
		if (await localPathIsFile(siblingLockFile)) lockFile = siblingLockFile;
	}
	return lockFile ? [lockFile] : [];
}
async function processImportMap(packageFile, importMapReferrer, lockFiles) {
	if (packageFile.startsWith("http")) return null;
	const content = await readLocalFile(packageFile, "utf8");
	if (!content) return null;
	const res = ImportMapExtract.safeParse(content);
	if (!res.success) {
		logger.debug({
			packageFile,
			err: res.error
		}, "Deno: extract failed");
		return null;
	}
	const deps = [];
	deps.push(...res.data.dependencies);
	return {
		deps,
		packageFile,
		managerData: { importMapReferrer },
		lockFiles
	};
}
async function processDenoExtract(data) {
	const { content, fileName } = data;
	const lockFiles = await getLockFiles(content.lock, fileName);
	let importMapPackageFile = null;
	if (content.importMap) importMapPackageFile = await processImportMap(content.importMap, fileName, lockFiles);
	return [{
		deps: content.dependencies,
		packageFile: fileName,
		managerData: content.managerData,
		lockFiles
	}, importMapPackageFile].filter(isObject);
}
//#endregion
export { extractAllPackageFiles, getLockFiles, processDenoExtract, processImportMap };

//# sourceMappingURL=extract.js.map