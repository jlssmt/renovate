import { regEx } from "../../../../../util/regex.js";
import { matchAt, replaceAt } from "../../../../../util/string.js";
import { logger } from "../../../../../logger/index.js";
import "../../dep-types.js";
import { getNewGitValue, getNewNpmAliasValue } from "./common.js";
import { updatePnpmWorkspaceDependency } from "./pnpm.js";
import { updateYarnrcCatalogDependency } from "./yarn.js";
import { isArray, isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/modules/manager/npm/update/dependency/index.ts
function renameObjKey(oldObj, oldKey, newKey) {
	return Object.keys(oldObj).reduce((acc, key) => {
		if (key === oldKey) acc[newKey] = oldObj[oldKey];
		else acc[key] = oldObj[key];
		return acc;
	}, {});
}
function replaceAsString(parsedContents, fileContent, depType, depName, oldValue, newValue, parents) {
	if (depType === "packageManager") parsedContents[depType] = newValue;
	else if (depType === "pnpm.overrides") parsedContents.pnpm.overrides[depName] = newValue;
	else if (depName === oldValue) delete Object.assign(parsedContents[depType], { [newValue]: parsedContents[depType][oldValue] })[oldValue];
	else if (depType === "dependenciesMeta") {
		// v8 ignore else -- TODO: add test #40625
		if (oldValue !== newValue) parsedContents.dependenciesMeta = renameObjKey(parsedContents.dependenciesMeta, oldValue, newValue);
	} else if (parents && depType === "overrides") {
		const { depObjectReference, overrideDepName } = overrideDepPosition(parsedContents[depType], parents, depName);
		// v8 ignore else -- TODO: add test #40625
		if (depObjectReference) depObjectReference[overrideDepName] = newValue;
	} else parsedContents[depType][depName] = newValue;
	const searchString = `"${oldValue}"`;
	let newString = `"${newValue}"`;
	const escapedDepName = RegExp.escape(depName);
	const match = regEx(`^(patch:${escapedDepName}@(npm:)?).*#`).exec(oldValue);
	if (match && depType === "resolutions") {
		const patch = oldValue.replace(match[0], `${match[1]}${newValue}#`);
		parsedContents[depType][depName] = patch;
		newString = `"${patch}"`;
	}
	let searchIndex = fileContent.indexOf(`"${depType}"`) + depType.length;
	logger.trace(`Starting search at index ${searchIndex}`);
	for (; searchIndex < fileContent.length; searchIndex += 1) if (matchAt(fileContent, searchIndex, searchString)) {
		logger.trace(`Found match at index ${searchIndex}`);
		const testContent = replaceAt(fileContent, searchIndex, searchString, newString);
		if (dequal(parsedContents, JSON.parse(testContent))) return testContent;
	}
	// v8 ignore next -- TODO: add test #40625
	throw new Error();
}
function updateDependency({ fileContent, packageFile: packageFileName, upgrade }) {
	if (upgrade.depType?.startsWith("pnpm.catalog") || upgrade.depType === "pnpm-workspace.overrides") return updatePnpmWorkspaceDependency({
		fileContent,
		packageFile: packageFileName,
		upgrade
	});
	if (upgrade.depType?.startsWith("yarn.catalog")) return updateYarnrcCatalogDependency({
		fileContent,
		packageFile: packageFileName,
		upgrade
	});
	const { depType, managerData } = upgrade;
	const depName = managerData?.key ?? upgrade.depName;
	let { newValue } = upgrade;
	newValue = getNewGitValue(upgrade) ?? newValue;
	newValue = getNewNpmAliasValue(newValue, upgrade) ?? newValue;
	logger.debug(`npm.updateDependency(): ${depType}.${depName} = ${newValue}`);
	try {
		const parsedContents = JSON.parse(fileContent);
		let overrideDepParents = void 0;
		let oldVersion;
		if (depType === "packageManager") {
			oldVersion = parsedContents[depType];
			newValue = `${depName}@${newValue}`;
		} else if (isOverrideObject(upgrade)) {
			overrideDepParents = managerData?.parents;
			// v8 ignore else -- TODO: add test #40625
			if (overrideDepParents) {
				const { depObjectReference, overrideDepName } = overrideDepPosition(parsedContents.overrides, overrideDepParents, depName);
				// v8 ignore else -- TODO: add test #40625
				if (depObjectReference) oldVersion = depObjectReference[overrideDepName];
			}
		} else if (depType === "pnpm.overrides") oldVersion = parsedContents.pnpm?.overrides?.[depName];
		else oldVersion = parsedContents[depType][depName];
		if (oldVersion === newValue && (!upgrade.newName || upgrade.newName === depName)) {
			logger.trace("Version is already updated");
			return fileContent;
		}
		let newFileContent;
		if (upgrade.newName && upgrade.replacementApproach === "alias") newFileContent = replaceAsString(parsedContents, fileContent, depType, depName, oldVersion, `npm:${upgrade.newName}@${newValue}`, overrideDepParents);
		else {
			newFileContent = replaceAsString(parsedContents, fileContent, depType, depName, oldVersion, newValue, overrideDepParents);
			if (upgrade.newName && upgrade.newName !== depName) newFileContent = replaceAsString(parsedContents, newFileContent, depType, depName, depName, upgrade.newName, overrideDepParents);
		}
		/* v8 ignore next -- needs test */
		if (!newFileContent) {
			logger.debug({
				fileContent,
				parsedContents,
				depType,
				depName,
				newValue
			}, "Warning: updateDependency error");
			return fileContent;
		}
		if (parsedContents?.resolutions) {
			let depKey;
			if (parsedContents.resolutions[depName]) depKey = depName;
			else if (parsedContents.resolutions[`**/${depName}`]) depKey = `**/${depName}`;
			if (depKey) {
				/* v8 ignore next -- needs test */
				if (parsedContents.resolutions[depKey] !== oldVersion) logger.debug({
					depName,
					depKey,
					oldVersion,
					resolutionsVersion: parsedContents.resolutions[depKey]
				}, "Upgraded dependency exists in yarn resolutions but is different version");
				newFileContent = replaceAsString(parsedContents, newFileContent, "resolutions", depKey, parsedContents.resolutions[depKey], newValue);
				if (upgrade.newName && upgrade.newName !== depName) {
					if (depKey === `**/${depName}`) upgrade.newName = `**/${upgrade.newName}`;
					newFileContent = replaceAsString(parsedContents, newFileContent, "resolutions", depKey, depKey, upgrade.newName);
				}
			}
		}
		if (parsedContents?.dependenciesMeta) {
			for (const [depKey] of Object.entries(parsedContents.dependenciesMeta)) if (depKey.startsWith(`${depName}@`)) newFileContent = replaceAsString(parsedContents, newFileContent, "dependenciesMeta", depName, depKey, `${depName}@${newValue}`);
		}
		return newFileContent;
	} catch (err) {
		logger.debug({ err }, "updateDependency error");
		return null;
	}
}
function overrideDepPosition(overrideBlock, parents, depName) {
	const lastParent = parents.at(-1);
	let overrideDep = overrideBlock;
	for (const parent of parents)
 // v8 ignore else -- TODO: add test #40625
	if (overrideDep) overrideDep = overrideDep[parent];
	return {
		depObjectReference: overrideDep,
		overrideDepName: depName === lastParent ? "." : depName
	};
}
function isOverrideObject(upgrade) {
	return isArray(upgrade.managerData?.parents, isNonEmptyStringAndNotWhitespace) && upgrade.depType === "overrides";
}
//#endregion
export { updateDependency };

//# sourceMappingURL=index.js.map