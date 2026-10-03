import api from "./custom/api.js";
import { customManagerList, isCustomManager } from "./custom/index.js";
import api$1 from "./api.js";
import { hashMap } from "./fingerprint.generated.js";
//#region lib/modules/manager/index.ts
const managerList = Array.from(api$1.keys());
function getManagerList() {
	return managerList;
}
function getManagers() {
	return api$1;
}
const allManagersList = [...managerList, ...customManagerList];
function get(manager, name) {
	return isCustomManager(manager) ? api.get(manager)?.[name] : api$1.get(manager)?.[name];
}
async function detectAllGlobalConfig() {
	let config = {};
	for (const managerName of allManagersList) {
		const manager = api$1.get(managerName) ?? api.get(managerName);
		if (manager.detectGlobalConfig) config = {
			...config,
			...await manager.detectGlobalConfig()
		};
	}
	return config;
}
async function extractAllPackageFiles(manager, config, files) {
	if (!api$1.has(manager)) return null;
	const m = api$1.get(manager);
	if (m.extractAllPackageFiles) {
		const res = await m.extractAllPackageFiles(config, files);
		// istanbul ignore if
		if (!res) return null;
		return res;
	}
	return null;
}
function extractPackageFile(manager, content, fileName, config) {
	const m = api$1.get(manager) ?? api.get(manager);
	if (!m) return null;
	return m.extractPackageFile ? m.extractPackageFile(content, fileName, config) : null;
}
function getRangeStrategy(config) {
	const { manager, rangeStrategy } = config;
	if (!manager || !api$1.has(manager)) return null;
	const m = api$1.get(manager);
	if (m.getRangeStrategy) {
		const managerRangeStrategy = m.getRangeStrategy(config);
		if (managerRangeStrategy === "in-range-only") return "update-lockfile";
		return managerRangeStrategy;
	}
	if (rangeStrategy === "auto") {
		if (m.updateLockedDependency) return "update-lockfile";
		return "replace";
	}
	if (rangeStrategy === "in-range-only") return "update-lockfile";
	return config.rangeStrategy;
}
function getPrettyDepType(manager, depType) {
	return (api$1.get(manager) ?? api.get(manager))?.knownDepTypes?.find((meta) => meta.depType === depType)?.prettyDepType;
}
function isKnownManager(mgr) {
	return allManagersList.includes(mgr.replace("custom.", ""));
}
/**
* Filter a list of managers based on enabled managers.
*
* If enabledManagers is provided, this function returns a subset of allManagersList
* that matches the enabled manager names, including custom managers. If enabledManagers
* is not provided or is an empty array, it returns the full list of managers.
*/
function getEnabledManagersList(enabledManagers) {
	if (enabledManagers?.length) return allManagersList.filter((manager) => enabledManagers.includes(manager) || enabledManagers.includes(`custom.${manager}`));
	return allManagersList;
}
//#endregion
export { allManagersList, detectAllGlobalConfig, extractAllPackageFiles, extractPackageFile, get, getEnabledManagersList, getManagerList, getManagers, getPrettyDepType, getRangeStrategy, hashMap, isKnownManager };

//# sourceMappingURL=index.js.map