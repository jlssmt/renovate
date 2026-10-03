import { logger } from "../logger/index.js";
import { clone } from "../util/clone.js";
import { getOptions } from "./options/index.js";
import { getHighestVulnerabilitySeverity } from "../util/vulnerability/utils.js";
//#region lib/config/utils.ts
function mergeChildConfig(parent, child) {
	logger.trace({
		parent,
		child
	}, `mergeChildConfig`);
	if (!child) return parent;
	const parentConfig = clone(parent);
	const childConfig = clone(child);
	const config = {
		...parentConfig,
		...childConfig
	};
	if (config?.isVulnerabilityAlert) config.vulnerabilitySeverity = getHighestVulnerabilitySeverity(parent, child);
	for (const option of getOptions()) if (option.mergeable && childConfig[option.name] && parentConfig[option.name]) {
		logger.trace(`mergeable option: ${option.name}`);
		if (option.name === "constraints") config[option.name] = {
			...parentConfig[option.name],
			...childConfig[option.name]
		};
		else if (option.type === "array") config[option.name] = parentConfig[option.name].concat(config[option.name]);
		else config[option.name] = mergeChildConfig(parentConfig[option.name], childConfig[option.name]);
		logger.trace({ result: config[option.name] }, `Merged config.${option.name}`);
	}
	return {
		...config,
		...config.force
	};
}
//#endregion
export { mergeChildConfig };

//# sourceMappingURL=utils.js.map