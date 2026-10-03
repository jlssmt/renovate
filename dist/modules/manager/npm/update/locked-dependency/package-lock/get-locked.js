import { logger } from "../../../../../../logger/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/package-lock/get-locked.ts
function getLockedDependencies(entry, depName, currentVersion, bundled = false) {
	let res = [];
	try {
		const { dependencies } = entry;
		if (!dependencies) return [];
		const dep = dependencies[depName];
		if (dep && (currentVersion === null || dep?.version === currentVersion)) {
			if (bundled || entry.bundled) dep.bundled = true;
			res.push(dep);
		}
		for (const dependency of Object.values(dependencies)) res = res.concat(getLockedDependencies(dependency, depName, currentVersion, bundled || !!entry.bundled));
	} catch (err) {
		logger.warn({ err }, "getLockedDependencies() error");
	}
	return res;
}
//#endregion
export { getLockedDependencies };

//# sourceMappingURL=get-locked.js.map