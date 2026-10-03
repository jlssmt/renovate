import { matchAt, replaceAt } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { parseJsonc } from "../../../util/common.js";
import { updateDependency as updateDependency$1 } from "../npm/update/dependency/index.js";
import "../npm/index.js";
import { UpdateDenoJsonFile, UpdateImportMapJsonFile } from "./schema.js";
import { isNonEmptyArray, isObject, isString } from "@sindresorhus/is";
import { dequal } from "dequal";
import upath from "upath";
//#region lib/modules/manager/deno/update.ts
function getValueByDatasource(datasource, depName, currentValue) {
	if (datasource === "deno") return currentValue ? `${depName}@${currentValue}` : depName;
	if (datasource === "jsr" || datasource === "npm") return currentValue ? `${datasource}:${depName}@${currentValue}` : `${datasource}:${depName}`;
	return null;
}
function replaceAsString(parsedContents, fileContent, depType, searchString, newString) {
	let searchIndex = fileContent.indexOf(`"${depType}"`) + depType.length;
	logger.trace(`Starting search at index ${searchIndex}`);
	for (; searchIndex < fileContent.length; searchIndex += 1) if (matchAt(fileContent, searchIndex, searchString)) {
		logger.trace(`Found match at index ${searchIndex}`);
		const testContent = replaceAt(fileContent, searchIndex, searchString, newString);
		if (dequal(parsedContents, parseJsonc(testContent))) return testContent;
	}
	throw new Error();
}
function updateImportMapLikeDepTypes(parsedContents, fileContent, depType, searchString, newString) {
	let newFileContent = null;
	if (depType === "imports" && parsedContents.imports) {
		const matches = Object.entries(parsedContents.imports).filter(([, value]) => value.includes(searchString));
		for (const [key] of matches) {
			parsedContents.imports[key] = parsedContents.imports[key].replace(searchString, newString);
			newFileContent = replaceAsString(parsedContents, fileContent, depType, searchString, newString);
		}
	}
	if (depType === "scopes" && parsedContents.scopes) for (const scopeName of Object.keys(parsedContents.scopes)) {
		const scope = parsedContents.scopes[scopeName];
		const matches = Object.entries(scope).filter(([, value]) => value.includes(searchString));
		for (const [key] of matches) {
			parsedContents.scopes[scopeName][key] = parsedContents.scopes[scopeName][key].replace(searchString, newString);
			newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchString, newString);
		}
	}
	return newFileContent;
}
function updateDependency(config) {
	const { fileContent, packageFile, upgrade } = config;
	const { depName, currentValue, newValue, datasource, managerData } = upgrade;
	if (!packageFile) {
		logger.debug("deno.updateDependency(): No package file found");
		return null;
	}
	if (managerData?.importMapReferrer) {
		if (!depName || !newValue || !datasource || !upgrade.depType) {
			logger.debug({
				depName,
				currentValue,
				newValue
			}, "Unknown value");
			return null;
		}
		const depType = upgrade.depType;
		logger.debug(`deno.updateDependency(): ${packageFile}:${depType}.${depName} = ${newValue}`);
		const parsedResult = UpdateImportMapJsonFile.safeParse(fileContent);
		if (!parsedResult.success) {
			logger.debug({ err: parsedResult.error }, `Invalid packageFile: ${packageFile} detected`);
			return null;
		}
		const parsedContents = parsedResult.data;
		const searchCurrentValue = getValueByDatasource(datasource, depName, currentValue);
		const newString = getValueByDatasource(datasource, depName, newValue);
		if (!searchCurrentValue || !newString) {
			logger.debug(`deno.updateDependency(): "${datasource}" is not supported datasource`);
			return null;
		}
		return updateImportMapLikeDepTypes(parsedContents, fileContent, depType, searchCurrentValue, newString);
	}
	if (upath.basename(packageFile).startsWith("deno.json")) {
		if (!depName || !newValue || !datasource || !upgrade.depType) {
			logger.debug({
				depName,
				currentValue,
				newValue
			}, "Unknown value");
			return null;
		}
		const depType = upgrade.depType;
		logger.debug(`deno.updateDependency(): ${packageFile}:${depType}.${depName} = ${newValue}`);
		const parsedResult = UpdateDenoJsonFile.safeParse(fileContent);
		if (!parsedResult.success) {
			logger.debug({ err: parsedResult.error }, `Invalid packageFile: ${packageFile} detected`);
			return null;
		}
		const parsedContents = parsedResult.data;
		let newFileContent = null;
		const searchCurrentValue = getValueByDatasource(datasource, depName, currentValue);
		const newString = getValueByDatasource(datasource, depName, newValue);
		if (!searchCurrentValue || !newString) {
			logger.debug(`deno.updateDependency(): "${datasource}" is not supported datasource`);
			return null;
		}
		newFileContent = updateImportMapLikeDepTypes(parsedContents, fileContent, depType, searchCurrentValue, newString);
		if (depType === "tasks" && parsedContents.tasks) {
			const matches = Object.entries(parsedContents.tasks).flatMap(([key, value]) => isString(value) && value.includes(searchCurrentValue) ? [[key, value]] : []);
			for (const [key, value] of matches) {
				parsedContents.tasks[key] = value.replace(searchCurrentValue, newString);
				newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
			}
		}
		if (depType === "tasks.command" && parsedContents.tasks) {
			function hasCommandMatch(value, currentValue) {
				return isObject(value) && "command" in value && isString(value.command) && value.command.includes(currentValue);
			}
			const matches = Object.entries(parsedContents.tasks).filter((entry) => hasCommandMatch(entry[1], searchCurrentValue));
			for (const [key, task] of matches) {
				task.command = task.command.replace(searchCurrentValue, newString);
				parsedContents.tasks[key] = task;
				newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
			}
		}
		if (depType === "compilerOptions.types" && isNonEmptyArray(parsedContents.compilerOptions?.types)) {
			const index = parsedContents.compilerOptions.types.findIndex((value) => value === searchCurrentValue);
			if (index !== -1) {
				parsedContents.compilerOptions.types[index] = parsedContents.compilerOptions.types[index].replace(searchCurrentValue, newString);
				newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
			}
		}
		if (depType === "compilerOptions.jsxImportSource" && parsedContents.compilerOptions?.jsxImportSource) {
			parsedContents.compilerOptions.jsxImportSource = parsedContents.compilerOptions.jsxImportSource.replace(searchCurrentValue, newString);
			newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
		}
		if (depType === "compilerOptions.jsxImportSourceTypes" && parsedContents.compilerOptions?.jsxImportSourceTypes) {
			parsedContents.compilerOptions.jsxImportSourceTypes = parsedContents.compilerOptions.jsxImportSourceTypes.replace(searchCurrentValue, newString);
			newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
		}
		if (depType === "lint.plugins" && isNonEmptyArray(parsedContents.lint?.plugins)) {
			const index = parsedContents.lint.plugins.findIndex((value) => value === searchCurrentValue);
			if (index !== -1) {
				parsedContents.lint.plugins[index] = parsedContents.lint.plugins[index].replace(searchCurrentValue, newString);
				newFileContent = replaceAsString(parsedContents, newFileContent ?? fileContent, depType, searchCurrentValue, newString);
			}
		}
		if (newFileContent === fileContent) return fileContent;
		return newFileContent;
	}
	if (upath.basename(packageFile) === "package.json") return updateDependency$1(config);
	logger.debug(`${packageFile} is not supported`);
	return null;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map