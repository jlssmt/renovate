import { coerceObject } from "../../../util/object.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getDep } from "../dockerfile/extract.js";
import { isObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/woodpecker/extract.ts
function woodpeckerVersionDecider(woodpeckerConfig) {
	const keys = [
		"clone",
		"steps",
		"pipeline",
		"services"
	];
	return Object.keys(woodpeckerConfig).filter((key) => keys.includes(key));
}
function extractPackageFile(content, packageFile, extractConfig) {
	logger.debug("woodpecker.extractPackageFile()");
	let config;
	try {
		config = parseSingleYaml(content);
		if (!config) {
			logger.debug({ packageFile }, "Null config when parsing Woodpecker Configuration content");
			return null;
		}
		if (!isObject(config)) {
			logger.debug({
				packageFile,
				type: typeof config
			}, "Unexpected type for Woodpecker Configuration content");
			return null;
		}
	} catch (err) {
		logger.debug({
			packageFile,
			err
		}, "Error parsing Woodpecker Configuration config YAML");
		return null;
	}
	const pipelineKeys = woodpeckerVersionDecider(config);
	if (pipelineKeys.length === 0) {
		logger.debug({ packageFile }, "Couldn't identify dependencies");
		return null;
	}
	const deps = pipelineKeys.flatMap((pipelineKey) => Object.values(coerceObject(config[pipelineKey])).filter((step) => isString(step?.image)).map((step) => getDep(step.image, true, extractConfig.registryAliases)));
	logger.trace({ deps }, "Woodpecker Configuration image");
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map