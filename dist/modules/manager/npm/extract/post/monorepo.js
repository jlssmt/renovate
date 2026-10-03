import { coerceObject } from "../../../../../util/object.js";
import { logger } from "../../../../../logger/index.js";
import { getParentDir, getSiblingFileName } from "../../../../../util/fs/index.js";
import { detectPnpmWorkspaces } from "../pnpm.js";
import { matchesAnyPattern } from "../utils.js";
import { isArray, isString, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/npm/extract/post/monorepo.ts
async function detectMonorepos(packageFiles) {
	await detectPnpmWorkspaces(packageFiles);
	logger.debug("Detecting workspaces");
	for (const p of packageFiles) {
		const { packageFile, npmrc, managerData = {}, skipInstalls } = p;
		const { npmLock, yarnZeroInstall, hasPackageManager, workspacesPackages, yarnLock } = managerData;
		const packages = workspacesPackages;
		if (packages?.length) {
			const internalPackagePatterns = (isArray(packages) ? packages : [packages]).map((pattern) => getSiblingFileName(packageFile, pattern));
			const internalPackageFiles = packageFiles.filter((sp) => matchesAnyPattern(getParentDir(sp.packageFile), internalPackagePatterns));
			const internalPackageNames = internalPackageFiles.map((sp) => sp.managerData?.packageJsonName).filter(isTruthy);
			p.deps?.forEach((dep) => {
				if (isString(dep.depName) && internalPackageNames.includes(dep.depName)) dep.isInternal = true;
			});
			for (const subPackage of internalPackageFiles) {
				subPackage.managerData = coerceObject(subPackage.managerData);
				subPackage.managerData.yarnZeroInstall = yarnZeroInstall;
				subPackage.managerData.hasPackageManager = hasPackageManager;
				subPackage.managerData.yarnLock ??= yarnLock;
				subPackage.managerData.npmLock ??= npmLock;
				subPackage.skipInstalls = skipInstalls && subPackage.skipInstalls;
				subPackage.managerData.workspacesPackages = workspacesPackages;
				subPackage.npmrc ??= npmrc;
				if (p.extractedConstraints) subPackage.extractedConstraints = {
					...p.extractedConstraints,
					...subPackage.extractedConstraints
				};
				subPackage.deps?.forEach((dep) => {
					if (isString(dep.depName) && internalPackageNames.includes(dep.depName)) dep.isInternal = true;
				});
			}
		}
	}
}
//#endregion
export { detectMonorepos };

//# sourceMappingURL=monorepo.js.map