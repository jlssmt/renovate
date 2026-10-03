import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { parseJson } from "../../../util/common.js";
import { ensureLocalPath } from "../../../util/fs/util.js";
import { getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { extractPackageJson } from "../npm/extract/common/package-file.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import upath from "upath";
import { findPackages } from "find-packages";
//#region lib/modules/manager/deno/compat.ts
async function extractDenoCompatiblePackageJson(packageFile) {
	const packageFileContent = await readLocalFile(packageFile, "utf8");
	if (!packageFileContent) {
		logger.debug({ packageFile }, "Deno: No package.json found");
		return null;
	}
	let packageJson;
	try {
		packageJson = parseJson(packageFileContent, packageFile);
	} catch (err) {
		logger.error({
			err,
			packageFile
		}, "Error parsing package.json");
		return null;
	}
	const extracted = extractPackageJson(packageJson, packageFile);
	if (!extracted) return null;
	const result = extracted;
	result.managerData = {
		packageName: extracted.managerData?.packageJsonName,
		workspaces: extracted.managerData?.workspaces
	};
	result.packageFile = packageFile;
	return result;
}
async function detectNodeCompatWorkspaces({ managerData, packageFile }) {
	logger.debug(`Detecting deno's node compat Workspaces`);
	let filters;
	if (isNonEmptyArray(managerData?.workspaces)) filters = managerData?.workspaces;
	if (!filters) return { packagePaths: [] };
	const localDir = GlobalConfig.get("localDir");
	const packagePaths = (await findPackages(upath.dirname(ensureLocalPath(packageFile)), {
		patterns: filters,
		ignore: ["**/node_modules/**", "**/bower_components/**"]
	})).map((pkg) => {
		const pkgPath = upath.join(pkg.dir, "package.json");
		return upath.relative(localDir, pkgPath);
	});
	return {
		workspaces: filters,
		packagePaths
	};
}
async function collectPackageJson(lockFile) {
	const lockFiles = [lockFile];
	const packageFiles = [];
	const rootPackageFile = await extractDenoCompatiblePackageJson(getSiblingFileName(lockFile, "package.json"));
	if (rootPackageFile) {
		rootPackageFile.lockFiles = lockFiles;
		const { workspaces, packagePaths } = await detectNodeCompatWorkspaces(rootPackageFile);
		rootPackageFile.managerData = {
			packageName: rootPackageFile.managerData?.packageName,
			workspaces
		};
		packageFiles.push(rootPackageFile);
		for (const packagePath of packagePaths) {
			const packageFile = await extractDenoCompatiblePackageJson(packagePath);
			if (packageFile) {
				packageFile.lockFiles = lockFiles;
				packageFiles.push(packageFile);
			}
		}
	}
	return packageFiles;
}
//#endregion
export { collectPackageJson, detectNodeCompatWorkspaces, extractDenoCompatiblePackageJson };

//# sourceMappingURL=compat.js.map