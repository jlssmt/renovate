import { logger } from "../../../../../logger/index.js";
import { YarnConfig } from "../../schema.js";
import { getNewGitValue, getNewNpmAliasValue } from "./common.js";
import { isObject, isString } from "@sindresorhus/is";
import { CST, isCollection, isPair, isScalar, parseDocument } from "yaml";
//#region lib/modules/manager/npm/update/dependency/yarn.ts
function updateYarnrcCatalogDependency({ fileContent, upgrade }) {
	const { depType, depName } = upgrade;
	const catalogName = depType?.split(".").at(-1);
	if (!isString(catalogName)) {
		logger.error("No catalogName was found; this is likely an extraction error.");
		return null;
	}
	let { newValue } = upgrade;
	newValue = getNewGitValue(upgrade) ?? newValue;
	newValue = getNewNpmAliasValue(newValue, upgrade) ?? newValue;
	logger.trace(`npm.updateYarnrcCatalogDependency(): ${depType}::${catalogName}.${depName} = ${newValue}`);
	let document;
	let parsedContents;
	try {
		document = parseDocument(fileContent, { keepSourceTokens: true });
		parsedContents = YarnConfig.parse(document.toString());
	} catch (err) {
		logger.debug({ err }, "Could not parse yarnrc YAML file.");
		return null;
	}
	let oldVersion;
	if (catalogName === "default") oldVersion = parsedContents.catalog?.[depName];
	else if (isObject(parsedContents.catalogs?.[catalogName]) && isString(depName)) oldVersion = parsedContents.catalogs?.[catalogName][depName];
	if (oldVersion === newValue) {
		logger.trace("Version is already updated");
		return fileContent;
	}
	const path = getDepPath({
		depName,
		catalogName
	});
	const modifiedDocument = changeDependencyIn(document, path, {
		newValue,
		newName: upgrade.newName
	});
	if (!modifiedDocument) return null;
	return CST.stringify(modifiedDocument.contents.srcToken);
}
/**
* Change the scalar name and/or value of a collection item in a YAML document,
* while keeping formatting consistent. Mutates the given document.
*/
function changeDependencyIn(document, path, { newName, newValue }) {
	const parentPath = path.slice(0, -1);
	const relevantItemKey = path.at(-1);
	const parentNode = document.getIn(parentPath);
	if (!parentNode || !isCollection(parentNode)) return null;
	const relevantNode = parentNode.items.find((item) => isPair(item) && isScalar(item.key) && item.key.value === relevantItemKey);
	if (!relevantNode || !isPair(relevantNode)) return null;
	if (newName) CST.setScalarValue(relevantNode.srcToken.key, newName);
	// v8 ignore else -- TODO: add test #40625
	if (newValue) {
		if (!CST.isScalar(relevantNode.srcToken?.value)) return null;
		CST.setScalarValue(relevantNode.srcToken.value, newValue);
	}
	return document;
}
function getDepPath({ catalogName, depName }) {
	if (catalogName === "default") return ["catalog", depName];
	return [
		"catalogs",
		catalogName,
		depName
	];
}
//#endregion
export { updateYarnrcCatalogDependency };

//# sourceMappingURL=yarn.js.map