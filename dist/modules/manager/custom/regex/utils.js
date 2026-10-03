import { coerceObject } from "../../../../util/object.js";
import { logger } from "../../../../logger/index.js";
import { migrateDatasource } from "../../../../config/migrations/custom/datasource-migration.js";
import { parseUrl } from "../../../../util/url.js";
import { validMatchFields } from "../utils.js";
import { compile } from "../../../../util/template/index.js";
import { isEmptyStringOrWhitespace } from "@sindresorhus/is";
//#region lib/modules/manager/custom/regex/utils.ts
function updateDependency(dependency, field, value) {
	switch (field) {
		case "registryUrl": {
			const url = parseUrl(value)?.toString();
			if (url) dependency.registryUrls = [url];
			else logger.warn({ value }, "Invalid regex manager registryUrl");
			break;
		}
		case "datasource":
			dependency.datasource = migrateDatasource(value);
			break;
		case "indentation":
			dependency.indentation = isEmptyStringOrWhitespace(value) ? value : "";
			break;
		default: dependency[field] = value;
	}
}
function createDependency(extractionTemplate, config, packageFileInfo, dep) {
	const dependency = coerceObject(dep);
	const { groups, replaceString } = extractionTemplate;
	const { packageFileName, packageFileDir } = packageFileInfo;
	for (const field of validMatchFields) {
		const tmpl = config[`${field}Template`];
		if (tmpl) try {
			updateDependency(dependency, field, compile(tmpl, {
				...groups,
				packageFile: packageFileName,
				packageFileDir
			}, false));
		} catch {
			logger.warn({ template: tmpl }, "Error compiling template for custom manager");
			return null;
		}
		else if (groups[field]) updateDependency(dependency, field, groups[field]);
	}
	dependency.replaceString = replaceString;
	return dependency;
}
function regexMatchAll(regex, content) {
	const matches = [];
	let matchResult;
	let iterations = 0;
	const maxIterations = 1e4;
	do {
		matchResult = regex.exec(content);
		if (matchResult) matches.push(matchResult);
		iterations += 1;
	} while (matchResult && iterations < maxIterations);
	if (iterations === maxIterations) logger.warn("Max iterations reached for matchStrings");
	return matches;
}
function mergeGroups(mergedGroup, secondGroup) {
	return {
		...mergedGroup,
		...secondGroup
	};
}
function mergeExtractionTemplate(base, addition) {
	return {
		groups: mergeGroups(base.groups, addition.groups),
		replaceString: addition.replaceString ?? base.replaceString
	};
}
//#endregion
export { createDependency, mergeExtractionTemplate, mergeGroups, regexMatchAll };

//# sourceMappingURL=utils.js.map