import { stripTemplates } from "./string.js";
import { logger } from "../logger/index.js";
import { parseAllDocuments, parseDocument, stringify } from "yaml";
//#region lib/util/yaml.ts
/**
* Parse a YAML string into a JavaScript object.
*
* Multiple documents are supported.
*
* If a schema is provided, the parsed object will be validated against it.
*
* If failureBehaviour is set to 'filter',
*      the function will return an empty array if the YAML parsing or schema validation fails and therefore will not throw an error.
*
* If failureBehaviour is set to 'throw',
*      the function will throw an error if the YAML parsing or schema validation fails for ANY document.
* @param content
* @param options
*/
function parseYaml(content, options) {
	const massagedContent = massageContent(content, options);
	const rawDocuments = parseAllDocuments(massagedContent, prepareParseOption(options));
	const schema = options?.customSchema;
	const results = [];
	for (const rawDocument of rawDocuments) {
		const errors = rawDocument.errors;
		if (errors?.length) {
			const error = new AggregateError(errors, "Failed to parse YAML file");
			if (options?.failureBehaviour === "filter") {
				logger.debug(`Failed to parse YAML file`);
				continue;
			}
			throw error;
		}
		const document = rawDocument.toJS({ maxAliasCount: 1e4 });
		if (!schema) {
			results.push(document);
			continue;
		}
		const result = schema.safeParse(document);
		if (result.success) {
			results.push(result.data);
			continue;
		}
		if (options?.failureBehaviour === "filter") {
			logger.trace({
				err: result.error,
				document
			}, "Failed to parse schema for YAML");
			continue;
		}
		throw new Error("Failed to parse YAML file", { cause: result.error });
	}
	return results;
}
/**
* Parse a YAML string into a JavaScript object.
*
* Only a single document is supported.
*
* If a schema is provided, the parsed object will be validated against it.
* Should the YAML parsing or schemata validation fail, an error will be thrown.
*
* @param content
* @param options
*/
function parseSingleYaml(content, options) {
	const document = parseSingleYamlDocument(content, options).toJS({ maxAliasCount: 1e4 });
	const schema = options?.customSchema;
	if (!schema) return document;
	return schema.parse(document);
}
/**
* Parse a YAML string into a Document representation.
*
* Only a single document is supported.
*
* @param content
* @param options
*/
function parseSingleYamlDocument(content, options) {
	const massagedContent = massageContent(content, options);
	const rawDocument = parseDocument(massagedContent, prepareParseOption(options));
	if (rawDocument?.errors?.length) throw new AggregateError(rawDocument.errors, "Failed to parse YAML file");
	return rawDocument;
}
function dump(obj, opts) {
	return stringify(obj, opts);
}
function massageContent(content, options) {
	if (options?.removeTemplates) return stripTemplates(content);
	return content;
}
function prepareParseOption(options) {
	return {
		prettyErrors: true,
		uniqueKeys: !options?.removeTemplates,
		strict: false,
		...options
	};
}
//#endregion
export { dump, parseSingleYaml, parseSingleYamlDocument, parseYaml };

//# sourceMappingURL=yaml.js.map