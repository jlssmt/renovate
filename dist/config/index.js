import { logger } from "../logger/index.js";
import { getOptions } from "./options/index.js";
import { mergeChildConfig } from "./utils.js";
import { allManagersList, get } from "../modules/manager/index.js";
//#region lib/config/index.ts
function getManagerConfig(config, manager) {
	let managerConfig = {
		...config,
		manager
	};
	const categories = get(manager, "categories");
	if (categories) managerConfig.categories = categories;
	managerConfig = mergeChildConfig(managerConfig, config[manager]);
	for (const i of allManagersList) delete managerConfig[i];
	return managerConfig;
}
function removeGlobalConfig(config, keepInherited) {
	const outputConfig = { ...config };
	for (const option of getOptions()) {
		if (keepInherited && option.inheritConfigSupport) continue;
		if (option.globalOnly) delete outputConfig[option.name];
	}
	return outputConfig;
}
function filterConfig(inputConfig, targetStage) {
	logger.trace({ config: inputConfig }, `filterConfig('${targetStage}')`);
	const outputConfig = { ...inputConfig };
	const stages = [
		"global",
		"inherit",
		"repository",
		"package",
		"branch",
		"pr"
	];
	const targetIndex = stages.indexOf(targetStage);
	for (const option of getOptions()) {
		const optionIndex = stages.indexOf(option.stage);
		if (optionIndex !== -1 && optionIndex < targetIndex) delete outputConfig[option.name];
	}
	return outputConfig;
}
//#endregion
export { filterConfig, getManagerConfig, mergeChildConfig, removeGlobalConfig };

//# sourceMappingURL=index.js.map