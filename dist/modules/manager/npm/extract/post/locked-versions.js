import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import { getPnpmLock } from "../pnpm.js";
import { getNpmLock } from "../npm.js";
import { getYarnLock, getYarnVersionFromLock } from "../yarn.js";
import { isString } from "@sindresorhus/is";
import upath from "upath";
import semver from "semver";
//#region lib/modules/manager/npm/extract/post/locked-versions.ts
const pnpmCatalogDepTypeRe = regEx(/pnpm\.catalog\.(?<version>.*)/);
async function getLockedVersions(packageFiles) {
	const lockFileCache = {};
	logger.debug("Finding locked versions");
	for (const packageFile of packageFiles) {
		const { managerData = {} } = packageFile;
		const { yarnLock, npmLock, pnpmLockFile } = managerData;
		const lockFiles = [];
		if (yarnLock) {
			logger.trace("Found yarnLock");
			lockFiles.push(yarnLock);
			// v8 ignore else -- TODO: add test #40625
			if (!lockFileCache[yarnLock]) {
				logger.trace(`Retrieving/parsing ${yarnLock}`);
				lockFileCache[yarnLock] = await getYarnLock(yarnLock);
			}
			const { isYarn1 } = lockFileCache[yarnLock];
			let yarn;
			if (!isYarn1 && !packageFile.extractedConstraints?.yarn) yarn = getYarnVersionFromLock(lockFileCache[yarnLock]);
			if (yarn) {
				packageFile.extractedConstraints ??= {};
				packageFile.extractedConstraints.yarn = yarn;
			}
			for (const dep of packageFile.deps) {
				dep.lockedVersion = lockFileCache[yarnLock].lockedVersions?.[`${dep.depName}@${dep.currentValue}`];
				if ((dep.depType === "engines" || dep.depType === "packageManager") && dep.depName === "yarn" && !isYarn1) dep.packageName = "@yarnpkg/cli";
			}
		} else if (npmLock) {
			logger.debug(`Found ${npmLock} for ${packageFile.packageFile}`);
			lockFiles.push(npmLock);
			if (!lockFileCache[npmLock]) {
				logger.trace(`Retrieving/parsing ${npmLock}`);
				const cache = await getNpmLock(npmLock);
				/* v8 ignore next -- needs test */
				if (!cache) {
					logger.warn({ npmLock }, "Npm: unable to get lockfile");
					return;
				}
				lockFileCache[npmLock] = cache;
			}
			const { lockfileVersion } = lockFileCache[npmLock];
			let npm;
			if (lockfileVersion === 1) {
				if (packageFile.extractedConstraints?.npm) {
					if (semver.satisfies("6.14.18", packageFile.extractedConstraints.npm)) npm = `${packageFile.extractedConstraints.npm} <7`;
				} else npm = "<7";
			} else if (lockfileVersion === 2) {
				if (packageFile.extractedConstraints?.npm) {
					if (semver.satisfies("8.19.3", packageFile.extractedConstraints.npm)) npm = `${packageFile.extractedConstraints.npm} <9`;
				} else npm = "<9";
			} else if (lockfileVersion === 3) {
				if (!packageFile.extractedConstraints?.npm) npm = ">=7";
			} else {
				logger.warn({
					lockfileVersion,
					npmLock
				}, "Found unsupported npm lockfile version");
				return;
			}
			if (npm) {
				packageFile.extractedConstraints ??= {};
				packageFile.extractedConstraints.npm = npm;
			}
			const packageDir = upath.dirname(packageFile.packageFile);
			const npmRootDir = upath.dirname(npmLock);
			const relativeDir = upath.relative(npmRootDir, packageDir);
			for (const dep of packageFile.deps) {
				if (dep.depType === "engines" || dep.depType === "packageManager" || dep.depType === "volta") continue;
				let lockedDepName = dep.depName;
				if (relativeDir && relativeDir !== ".") lockedDepName = `${relativeDir}/node_modules/${dep.depName}`;
				dep.lockedVersion = semver.valid(lockFileCache[npmLock].lockedVersions?.[lockedDepName]);
			}
		} else if (pnpmLockFile) {
			logger.debug("Found pnpm lock-file");
			lockFiles.push(pnpmLockFile);
			if (!lockFileCache[pnpmLockFile]) {
				logger.trace(`Retrieving/parsing ${pnpmLockFile}`);
				lockFileCache[pnpmLockFile] = await getPnpmLock(pnpmLockFile);
			}
			const packageDir = upath.dirname(packageFile.packageFile);
			const pnpmRootDir = upath.dirname(pnpmLockFile);
			const relativeDir = upath.relative(pnpmRootDir, packageDir) || ".";
			for (const dep of packageFile.deps) {
				const { depName, depType } = dep;
				const catalogName = pnpmCatalogDepTypeRe.exec(depType)?.groups?.version;
				if (catalogName) {
					const lockedVersion = semver.valid(lockFileCache[pnpmLockFile].lockedVersionsWithCatalog?.[catalogName]?.[depName]);
					// v8 ignore else -- TODO: add test #40625
					if (isString(lockedVersion)) dep.lockedVersion = lockedVersion;
				} else {
					const lockedVersion = semver.valid(lockFileCache[pnpmLockFile].lockedVersionsWithPath?.[relativeDir]?.[depType]?.[depName]);
					// v8 ignore else -- TODO: add test #40625
					if (isString(lockedVersion)) dep.lockedVersion = lockedVersion;
				}
			}
		}
		if (lockFiles.length) packageFile.lockFiles = lockFiles;
	}
}
//#endregion
export { getLockedVersions };

//# sourceMappingURL=locked-versions.js.map