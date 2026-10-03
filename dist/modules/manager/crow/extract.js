import { coerceObject } from "../../../util/object.js";
import { logger } from "../../../logger/index.js";
import { getDep } from "../dockerfile/extract.js";
import { CrowConfig } from "./schema.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/manager/crow/extract.ts
function crowVersionDecider(config) {
	const keys = [
		"clone",
		"steps",
		"pipeline",
		"services"
	];
	return Object.keys(config).filter((key) => keys.includes(key));
}
function extractPackageFile(content, packageFile, extractConfig) {
	logger.debug("crow  .extractPackageFile()");
	const result = CrowConfig.safeParse(content);
	if (!result.success) {
		logger.debug({
			packageFile,
			err: result.error
		}, "Invalid Crow Configuration schema");
		return null;
	}
	const config = result.data;
	const pipelineKeys = crowVersionDecider(config);
	if (pipelineKeys.length === 0) {
		logger.debug({ packageFile }, "Couldn't identify dependencies");
		return null;
	}
	const deps = pipelineKeys.flatMap((pipelineKey) => {
		const pipelineValue = config[pipelineKey];
		return (Array.isArray(pipelineValue) ? pipelineValue : Object.values(coerceObject(pipelineValue))).filter((step) => isString(step?.image)).map((step) => getDep(step.image, true, extractConfig.registryAliases));
	});
	logger.trace({ deps }, "Crow Configuration image");
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map