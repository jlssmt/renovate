import { logger } from "../../../../logger/index.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/workers/repository/onboarding/pr/config-description.ts
function getScheduleDesc(config) {
	logger.debug("getScheduleDesc()");
	logger.trace({ config });
	if (!config.schedule || config.schedule === "at any time" || config.schedule[0] === "at any time") {
		logger.debug("No schedule");
		return [];
	}
	return [`Run Renovate on following schedule: ${String(config.schedule)}`];
}
function getDescriptionArray(config) {
	logger.debug("getDescriptionArray()");
	logger.trace({ config });
	return (isArray(config.description, isString) ? config.description : []).concat(getScheduleDesc(config));
}
function getConfigDesc(config, _packageFiles) {
	logger.debug("getConfigDesc()");
	logger.trace({ config });
	const descriptionArr = getDescriptionArray(config);
	if (!descriptionArr.length) {
		logger.debug("No config description found");
		return "";
	}
	logger.debug(`Found description array with length:${descriptionArr.length}`);
	let desc = `\n### Configuration Summary\n\nBased on the default config's presets, Renovate will:\n\n`;
	desc += `  - Start dependency updates only once this onboarding PR is merged\n`;
	descriptionArr.forEach((d) => {
		desc += `  - ${d}\n`;
	});
	desc += "\n---\n";
	return desc;
}
//#endregion
export { getConfigDesc, getScheduleDesc };

//# sourceMappingURL=config-description.js.map