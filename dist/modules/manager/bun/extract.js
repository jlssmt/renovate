import { logger } from "../../../logger/index.js";
import { getParentDir, getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { resolveNpmrc } from "../npm/npmrc.js";
import { extractPackageJson } from "../npm/extract/common/package-file.js";
import { filesMatchingWorkspaces } from "./utils.js";
import { isArray, isObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/bun/extract.ts
function matchesFileName(fileNameWithPath, fileName) {
	return fileNameWithPath === fileName || fileNameWithPath.endsWith(`/${fileName}`);
}
async function processPackageFile(packageFile, config) {
	const fileContent = await readLocalFile(packageFile, "utf8");
	if (!fileContent) {
		logger.warn({ fileName: packageFile }, "Could not read file content");
		return null;
	}
	let packageJson;
	try {
		packageJson = JSON.parse(fileContent);
	} catch (err) {
		logger.debug({ err }, "Error parsing package.json");
		return null;
	}
	const result = extractPackageJson(packageJson, packageFile);
	if (!result) {
		logger.debug({ packageFile }, "No dependencies found");
		return null;
	}
	const { npmrc } = await resolveNpmrc(packageFile, config);
	return {
		...result,
		packageFile,
		npmrc
	};
}
async function extractAllPackageFiles(config, matchedFiles) {
	const packageFiles = [];
	const allLockFiles = matchedFiles.filter((file) => matchesFileName(file, "bun.lock") || matchesFileName(file, "bun.lockb"));
	if (allLockFiles.length === 0) {
		logger.debug("No bun lockfiles found");
		return packageFiles;
	}
	const allPackageJson = matchedFiles.filter((file) => matchesFileName(file, "package.json"));
	for (const lockFile of allLockFiles) {
		const packageFile = getSiblingFileName(lockFile, "package.json");
		const res = await processPackageFile(packageFile, config);
		if (res) packageFiles.push({
			...res,
			lockFiles: [lockFile]
		});
		let workspaces = res?.managerData?.workspaces;
		if (isObject(workspaces) && "packages" in workspaces) workspaces = workspaces.packages;
		if (!isArray(workspaces, isString)) continue;
		logger.debug(`Found bun workspaces in ${packageFile}`);
		const pwd = getParentDir(packageFile);
		const workspacePackageFiles = filesMatchingWorkspaces(pwd, allPackageJson, workspaces);
		if (workspacePackageFiles.length) {
			logger.debug({ workspacePackageFiles }, "Found bun workspace files");
			for (const workspaceFile of workspacePackageFiles) {
				const res = await processPackageFile(workspaceFile, config);
				if (res) packageFiles.push({
					...res,
					lockFiles: [lockFile]
				});
			}
		}
	}
	return packageFiles;
}
//#endregion
export { extractAllPackageFiles, processPackageFile };

//# sourceMappingURL=extract.js.map