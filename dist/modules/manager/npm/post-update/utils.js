import { logger } from "../../../../logger/index.js";
import { Lazy } from "../../../../util/lazy.js";
import { loadPackageJson } from "../utils.js";
import { isArray } from "@sindresorhus/is";
import semver from "semver";
//#region lib/modules/manager/npm/post-update/utils.ts
function lazyLoadPackageJson(lockFileDir) {
	return new Lazy(() => loadPackageJson(lockFileDir));
}
function getPackageManagerVersion(name, pkg) {
	if (pkg.volta?.[name]) {
		const version = pkg.volta[name];
		logger.debug(`Found ${name} constraint in package.json volta: ${version}`);
		return version;
	}
	if (pkg.devEngines?.packageManager) {
		const version = (isArray(pkg.devEngines.packageManager) ? pkg.devEngines.packageManager : [pkg.devEngines.packageManager]).find((pm) => pm.name === name)?.version;
		// v8 ignore else -- TODO: add test #40625
		if (version) {
			logger.debug(`Found ${name} constraint in package.json devEngines: ${version}`);
			return version;
		}
	}
	if (pkg.packageManager?.name === name) {
		const version = pkg.packageManager.version;
		logger.debug(`Found ${name} constraint in package.json packageManager: ${version}`);
		if (semver.valid(version)) return version;
		return null;
	}
	if (pkg.engines?.[name]) {
		const version = pkg.engines[name];
		logger.debug(`Found ${name} constraint in package.json engines: ${version}`);
		return version;
	}
	return null;
}
function getNodeOptions(nodeMaxMemory) {
	return `--max-old-space-size=${nodeMaxMemory}`;
}
//#endregion
export { getNodeOptions, getPackageManagerVersion, lazyLoadPackageJson };

//# sourceMappingURL=utils.js.map