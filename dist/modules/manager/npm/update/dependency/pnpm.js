import { logger } from "../../../../../logger/index.js";
import { PnpmWorkspaceFile } from "../../schema.js";
import "../../dep-types.js";
import { getNewGitValue, getNewNpmAliasValue } from "./common.js";
import { isString } from "@sindresorhus/is";
import { CST, isCollection, isPair, isScalar, parseDocument } from "yaml";
//#region lib/modules/manager/npm/update/dependency/pnpm.ts
function updatePnpmWorkspaceDependency({ fileContent, upgrade }) {
	const { depType, depName } = upgrade;
	const catalogName = depType?.split(".").at(-1);
	if (!isString(catalogName) && depType !== "pnpm-workspace.overrides") {
		logger.error("No catalogName or override was found; this is likely an extraction error.");
		return null;
	}
	let { newValue } = upgrade;
	newValue = getNewGitValue(upgrade) ?? newValue;
	newValue = getNewNpmAliasValue(newValue, upgrade) ?? newValue;
	logger.trace(`npm.updatePnpmWorkspaceDependency(): ${depType}:${depName} = ${newValue}`);
	let document;
	let parsedContents;
	try {
		document = parseDocument(fileContent, { keepSourceTokens: true });
		parsedContents = PnpmWorkspaceFile.parse(fileContent);
	} catch (err) {
		logger.debug({ err }, "Could not parse pnpm-workspace YAML file.");
		return null;
	}
	const usesImplicitDefaultCatalog = parsedContents.catalog !== void 0;
	const isCatalogUpdate = catalogName && depType !== "pnpm-workspace.overrides";
	let oldVersion;
	if (isCatalogUpdate) {
		if (catalogName === "default" && usesImplicitDefaultCatalog) oldVersion = parsedContents.catalog?.[depName];
		else oldVersion = parsedContents.catalogs?.[catalogName]?.[depName];
	} else oldVersion = parsedContents.overrides?.[depName];
	if (oldVersion === newValue) {
		logger.trace("Version is already updated");
		return fileContent;
	}
	const path = isCatalogUpdate ? getDepPath({
		depName,
		catalogName,
		usesImplicitDefaultCatalog
	}) : ["overrides", depName];
	const modifiedDocument = changeDependencyIn(document, path, {
		newValue,
		newName: upgrade.newName
	});
	if (!modifiedDocument) return null;
	/* v8 ignore if -- this should not happen in practice, but we must satisfy the types */
	if (!modifiedDocument.contents?.srcToken) return null;
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
	if (newName) {
		/* v8 ignore if -- the try..catch block above already throws if a key is an alias */
		if (!CST.isScalar(relevantNode.srcToken?.key)) return null;
		CST.setScalarValue(relevantNode.srcToken.key, newName);
	}
	// v8 ignore else -- TODO: add test #40625
	if (newValue) {
		if (!CST.isScalar(relevantNode.srcToken?.value)) return null;
		CST.setScalarValue(relevantNode.srcToken.value, newValue);
	}
	return document;
}
function getDepPath({ catalogName, depName, usesImplicitDefaultCatalog }) {
	if (catalogName === "default" && usesImplicitDefaultCatalog) return ["catalog", depName];
	return [
		"catalogs",
		catalogName,
		depName
	];
}
//#endregion
export { updatePnpmWorkspaceDependency };

//# sourceMappingURL=pnpm.js.map