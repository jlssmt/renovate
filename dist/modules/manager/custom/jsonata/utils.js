import { logger } from "../../../../logger/index.js";
import { migrateDatasource } from "../../../../config/migrations/custom/datasource-migration.js";
import { parseUrl } from "../../../../util/url.js";
import { checkIsValidDependency, validMatchFields } from "../utils.js";
import { compile } from "../../../../util/template/index.js";
import { QueryResultZod } from "./schema.js";
import { isEmptyArray, isTruthy } from "@sindresorhus/is";
import jsonata from "jsonata";
//#region lib/modules/manager/custom/jsonata/utils.ts
async function handleMatching(json, packageFile, config) {
	let results = [];
	const { matchStrings: jsonataQueries } = config;
	for (const query of jsonataQueries) {
		const jsonataExpression = jsonata(query);
		let queryResult;
		try {
			queryResult = await jsonataExpression.evaluate(json);
		} catch (err) {
			logger.warn({
				err,
				jsonataQuery: query,
				packageFile
			}, "Error executing jsonata query. Please check your query.");
			continue;
		}
		if (!queryResult || isEmptyArray(queryResult)) {
			logger.debug({
				jsonataQuery: query,
				packageFile
			}, "The jsonata query returned no matches. Possible error, please check your query. Skipping");
			continue;
		}
		const parsed = QueryResultZod.safeParse(queryResult);
		if (parsed.success) results = results.concat(parsed.data);
		else {
			logger.warn({
				err: parsed.error,
				jsonataQuery: query,
				packageFile,
				queryResult
			}, "Query results failed schema validation");
			continue;
		}
	}
	return results.map((dep) => createDependency(dep, config)).filter(isTruthy).filter((dep) => checkIsValidDependency(dep, packageFile, "custom.jsonata"));
}
function createDependency(queryResult, config) {
	const dependency = {};
	for (const field of validMatchFields) {
		const tmpl = config[`${field}Template`];
		if (tmpl) try {
			updateDependency(field, compile(tmpl, queryResult, false), dependency);
		} catch {
			logger.debug({ template: tmpl }, "Error compiling template for JSONata manager");
			return null;
		}
		else if (queryResult[field]) updateDependency(field, queryResult[field], dependency);
	}
	return dependency;
}
function updateDependency(field, value, dependency) {
	switch (field) {
		case "registryUrl": {
			const url = parseUrl(value)?.toString();
			if (!url) {
				logger.debug({ url: value }, "Invalid JSONata manager registryUrl");
				break;
			}
			dependency.registryUrls = [url];
			break;
		}
		case "datasource":
			dependency.datasource = migrateDatasource(value);
			break;
		default: dependency[field] = value;
	}
	return dependency;
}
//#endregion
export { createDependency, handleMatching };

//# sourceMappingURL=utils.js.map