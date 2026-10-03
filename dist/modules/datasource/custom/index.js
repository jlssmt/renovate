import { logger } from "../../../logger/index.js";
import { getExpression } from "../../../util/jsonata.js";
import { Datasource } from "../datasource.js";
import { fetchers } from "./formats/index.js";
import { ReleaseResultZod } from "./schema.js";
import { getCustomConfig } from "./utils.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/custom/index.ts
var CustomDatasource = class CustomDatasource extends Datasource {
	static id = "custom";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	constructor() {
		super(CustomDatasource.id);
	}
	async getReleases(getReleasesConfig) {
		const config = getCustomConfig(getReleasesConfig);
		if (isNullOrUndefined(config)) return null;
		const { defaultRegistryUrlTemplate, transformTemplates, format } = config;
		const fetcher = fetchers[format];
		const isLocalRegistry = defaultRegistryUrlTemplate.startsWith("file://");
		let data;
		try {
			if (isLocalRegistry) data = await fetcher.readFile(defaultRegistryUrlTemplate.replace("file://", ""));
			else data = await fetcher.fetch(this.http, defaultRegistryUrlTemplate);
		} catch (e) {
			this.handleHttpErrors(e);
			return null;
		}
		logger.trace({ data }, `Custom datasource API fetcher '${format}' received data. Starting transformation.`);
		for (const transformTemplate of transformTemplates) {
			const expression = getExpression(transformTemplate);
			if (expression instanceof Error) {
				logger.once.warn({
					errorMessage: expression.message,
					transformTemplate
				}, "Invalid JSONata expression");
				return null;
			}
			try {
				const modifiedData = await expression.evaluate(data);
				logger.trace({
					before: data,
					after: modifiedData
				}, `Custom datasource transformed data.`);
				data = modifiedData;
			} catch (err) {
				logger.once.warn({
					err,
					transformTemplate
				}, "Error while evaluating JSONata expression");
				return null;
			}
		}
		try {
			const parsed = ReleaseResultZod.parse(data);
			return structuredClone(parsed);
		} catch (err) {
			logger.debug({ err }, `Response has failed validation`);
			logger.trace({ data }, "Response that has failed validation");
			return null;
		}
	}
	getDigest(_cfg, _newValue) {
		return Promise.resolve(null);
	}
};
//#endregion
export { CustomDatasource };

//# sourceMappingURL=index.js.map