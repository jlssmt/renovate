import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { compile } from "../../../util/template/index.js";
import { isNonEmptyString, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/custom/utils.ts
function massageCustomDatasourceConfig(customDatasourceName, { customDatasources, packageName, currentValue, registryUrl: defaultRegistryUrl }) {
	const customDatasource = customDatasources?.[customDatasourceName];
	if (isNullOrUndefined(customDatasource)) {
		logger.debug(`No custom datasource config provided while ${packageName} has been requested`);
		return null;
	}
	const templateInput = {
		packageName,
		currentValue
	};
	const registryUrlTemplate = defaultRegistryUrl ?? customDatasource.defaultRegistryUrlTemplate;
	if (isNullOrUndefined(registryUrlTemplate)) {
		logger.debug("No registry url provided by extraction nor datasource configuration");
		return null;
	}
	const registryUrl = compile(registryUrlTemplate, templateInput);
	const transformTemplates = coerceArray(customDatasource.transformTemplates);
	const transform = [];
	for (const transformTemplate of transformTemplates) {
		const templated = compile(transformTemplate, templateInput);
		transform.push(templated);
	}
	logger.trace({ transform }, `Custom datasource compiled data.`);
	return {
		format: customDatasource.format ?? "json",
		defaultRegistryUrlTemplate: registryUrl,
		transformTemplates: transform
	};
}
function getCustomConfig(getReleasesConfig) {
	const customDatasourceName = getReleasesConfig.datasource?.replace("custom.", "");
	if (!isNonEmptyString(customDatasourceName)) {
		logger.debug(`No datasource has been supplied while looking up ${getReleasesConfig.packageName}`);
		return null;
	}
	return massageCustomDatasourceConfig(customDatasourceName, getReleasesConfig);
}
//#endregion
export { getCustomConfig, massageCustomDatasourceConfig };

//# sourceMappingURL=utils.js.map