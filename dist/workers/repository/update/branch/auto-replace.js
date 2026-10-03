import { WORKER_FILE_UPDATE_FAILED } from "../../../../constants/error-messages.js";
import { regEx } from "../../../../util/regex.js";
import { matchAt, replaceAt } from "../../../../util/string.js";
import { logger } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import { writeLocalFile } from "../../../../util/fs/index.js";
import { extractPackageFile } from "../../../../modules/manager/index.js";
import { isNumber, isString, isUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/update/branch/auto-replace.ts
async function confirmIfDepUpdated(upgrade, newContent) {
	const { manager, packageFile, depIndex } = upgrade;
	let newUpgrade;
	try {
		const newExtract = await extractPackageFile(manager, newContent, packageFile, upgrade);
		// istanbul ignore if
		if (!newExtract) {
			logger.debug(`Could not extract ${packageFile} (manager=${manager}) after autoreplace. Did the autoreplace make the file unparseable?`);
			logger.trace({
				packageFile,
				content: newContent
			}, "packageFile content after autoreplace");
			return false;
		}
		// istanbul ignore if
		if (!newExtract.deps?.length) {
			logger.debug(`Extracted ${packageFile} after autoreplace has no deps array. Did the autoreplace make the file unparseable?`);
			return false;
		}
		// istanbul ignore if
		if (isNumber(depIndex) && depIndex >= newExtract.deps.length) {
			logger.debug(`Extracted ${packageFile} after autoreplace has fewer deps than expected.`);
			return false;
		}
		newUpgrade = newExtract.deps[depIndex];
	} catch (err) {
		/* istanbul ignore next */
		logger.debug({
			manager,
			packageFile,
			err
		}, "Failed to parse newContent");
	}
	if (!newUpgrade) {
		logger.debug(`No newUpgrade in ${packageFile}`);
		return false;
	}
	if (upgrade.depName !== newUpgrade.depName && upgrade.newName !== newUpgrade.depName) {
		logger.debug({
			manager,
			packageFile,
			currentDepName: upgrade.depName,
			newDepName: newUpgrade.depName
		}, "depName mismatch");
		return false;
	}
	if (upgrade.newName && upgrade.newName !== newUpgrade.depName) {
		logger.debug({
			manager,
			packageFile,
			currentDepName: upgrade.depName,
			newDepName: newUpgrade.depName
		}, "depName is not updated");
		return false;
	}
	if (upgrade.newValue && upgrade.newValue !== newUpgrade.currentValue) {
		let templateMatchesExtractedValue = false;
		if (upgrade.autoReplaceStringTemplate) try {
			templateMatchesExtractedValue = compile(upgrade.autoReplaceStringTemplate, upgrade, false) === newUpgrade.currentValue;
		} catch (err) {
			logger.debug({
				err,
				manager,
				packageFile
			}, "Failed to compile autoReplaceStringTemplate in confirmIfDepUpdated");
		}
		if (!templateMatchesExtractedValue) {
			logger.debug({
				depName: upgrade.depName,
				manager,
				packageFile,
				expectedValue: upgrade.newValue,
				foundValue: newUpgrade.currentValue
			}, "Value is not updated");
			return false;
		}
	}
	if (upgrade.newDigest && (upgrade.isPinDigest === true || upgrade.currentDigest) && upgrade.newDigest !== newUpgrade.currentDigest) {
		logger.debug({
			depName: upgrade.depName,
			manager,
			packageFile,
			expectedValue: upgrade.newDigest,
			foundValue: newUpgrade.currentDigest
		}, "Digest is not updated");
		return false;
	}
	return true;
}
function getDepsSignature(deps) {
	return deps.map((dep) => `${dep.depName ?? dep.packageName}${dep.packageName ?? dep.depName}`).join(",");
}
function firstIndexOf(existingContent, depName, currentValue, position = 0) {
	const depIndex = existingContent.indexOf(depName, position);
	const valIndex = existingContent.indexOf(currentValue, position);
	const index = depIndex < valIndex ? depIndex : valIndex;
	if (index < 0) return position === 0 ? -1 : existingContent.length;
	return index;
}
async function checkBranchDepsMatchBaseDeps(upgrade, branchContent) {
	const { baseDeps, manager, packageFile } = upgrade;
	try {
		const branchDeps = (await extractPackageFile(manager, branchContent, packageFile, upgrade)).deps;
		return getDepsSignature(baseDeps) === getDepsSignature(branchDeps);
	} catch /* istanbul ignore next */ {
		logger.info({
			manager,
			packageFile
		}, "Failed to parse branchContent - rebasing");
		return false;
	}
}
async function checkExistingBranch(upgrade, existingContent) {
	const { packageFile, depName } = upgrade;
	if (!await checkBranchDepsMatchBaseDeps(upgrade, existingContent)) {
		logger.debug({
			packageFile,
			depName
		}, "Rebasing branch after deps list has changed");
		return null;
	}
	if (!await confirmIfDepUpdated(upgrade, existingContent)) {
		logger.debug({
			packageFile,
			depName
		}, "Rebasing after outdated branch dep found");
		return null;
	}
	logger.debug(`Branch dep ${depName} in ${packageFile} is already updated`);
	return existingContent;
}
async function doAutoReplace(upgrade, existingContent, reuseExistingBranch, firstUpdate = true) {
	const { packageFile, depName, depNameTemplate, newName, currentValue, currentValueTemplate, newValue, currentDigest, currentDigestShort, newDigest, autoReplaceGlobalMatch, autoReplaceStringTemplate } = upgrade;
	if (reuseExistingBranch) return await checkExistingBranch(upgrade, existingContent);
	const valueChanging = isString(currentValue) && isString(newValue) && currentValue !== newValue;
	const digestChanging = isString(currentDigest) && isString(newDigest) && currentDigest !== newDigest;
	let replaceWithoutReplaceString = isString(newName) && newName !== depName && (isUndefined(upgrade.replaceString) || !upgrade.replaceString?.includes(depName));
	let replaceString = upgrade.replaceString;
	if (isUndefined(replaceString)) {
		if (valueChanging && digestChanging) {
			replaceWithoutReplaceString = true;
			replaceString = currentValue;
		} else if (digestChanging) replaceString = currentDigest;
		else replaceString = currentValue ?? currentDigest;
	}
	logger.trace({
		depName,
		replaceString
	}, "autoReplace replaceString");
	let searchIndex;
	if (replaceWithoutReplaceString) searchIndex = firstIndexOf(existingContent, depName, currentValue);
	else searchIndex = existingContent.indexOf(replaceString);
	if (searchIndex === -1) {
		logger.info({
			packageFile,
			depName,
			existingContent,
			replaceString
		}, "Cannot find replaceString in current file content. Was it already updated?");
		return existingContent;
	}
	try {
		let newString;
		if (autoReplaceStringTemplate && !newName) newString = compile(autoReplaceStringTemplate, upgrade, false);
		else {
			newString = replaceString;
			const autoReplaceRegExpFlag = autoReplaceGlobalMatch ? "g" : "";
			if (currentValue && newValue && currentValue !== newValue) {
				if (!newString.includes(currentValue)) logger.debug({
					stringToReplace: newString,
					currentValue,
					currentValueTemplate
				}, "currentValue not found in string to replace");
				newString = newString.replace(regEx(RegExp.escape(currentValue), autoReplaceRegExpFlag), newValue);
			}
			if (depName && newName && depName !== newName) {
				if (!newString.includes(depName)) logger.debug({
					stringToReplace: newString,
					depName,
					depNameTemplate
				}, "depName not found in string to replace");
				newString = newString.replace(regEx(RegExp.escape(depName), autoReplaceRegExpFlag), newName);
			}
			if (currentDigest && newDigest && currentDigest !== newDigest) {
				if (!newString.includes(currentDigest)) logger.debug({
					stringToReplace: newString,
					currentDigest
				}, "currentDigest not found in string to replace");
				newString = newString.replace(regEx(RegExp.escape(currentDigest), autoReplaceRegExpFlag), newDigest);
			} else if (currentDigestShort && newDigest && currentDigestShort !== newDigest && !(currentDigest && currentDigest === newDigest)) {
				if (!newString.includes(currentDigestShort)) logger.debug({
					stringToReplace: newString,
					currentDigestShort
				}, "currentDigestShort not found in string to replace");
				newString = newString.replace(regEx(RegExp.escape(currentDigestShort), autoReplaceRegExpFlag), newDigest);
			}
		}
		if (!firstUpdate && await confirmIfDepUpdated(upgrade, existingContent)) {
			logger.debug({
				packageFile,
				depName
			}, "Package file is already updated - no work to do");
			return existingContent;
		}
		logger.debug({
			packageFile,
			depName
		}, `Starting search at index ${searchIndex}`);
		let newContent = existingContent;
		let nameReplaced = !newName;
		let valueReplaced = !newValue;
		let digestReplaced = !newDigest;
		let startIndex = searchIndex;
		for (; searchIndex < newContent.length; searchIndex += 1) if (replaceWithoutReplaceString) {
			if (newName && matchAt(newContent, searchIndex, depName)) {
				logger.debug({
					packageFile,
					depName
				}, `Found depName at index ${searchIndex}`);
				if (nameReplaced) {
					startIndex = firstIndexOf(existingContent, depName, currentValue, startIndex + 1);
					searchIndex = startIndex - 1;
					await writeLocalFile(upgrade.packageFile, existingContent);
					newContent = existingContent;
					nameReplaced = !newName;
					valueReplaced = !newValue;
					digestReplaced = !newDigest;
					continue;
				}
				newContent = replaceAt(newContent, searchIndex, depName, newName);
				await writeLocalFile(upgrade.packageFile, newContent);
				nameReplaced = true;
				searchIndex += newName.length - 1;
			} else if (newValue && matchAt(newContent, searchIndex, currentValue)) {
				logger.debug({
					packageFile,
					currentValue
				}, `Found currentValue at index ${searchIndex}`);
				if (valueReplaced) {
					startIndex = firstIndexOf(existingContent, depName, currentValue, startIndex + 1);
					searchIndex = startIndex - 1;
					await writeLocalFile(upgrade.packageFile, existingContent);
					newContent = existingContent;
					nameReplaced = !newName;
					valueReplaced = !newValue;
					digestReplaced = !newDigest;
					continue;
				}
				newContent = replaceAt(newContent, searchIndex, currentValue, newValue);
				await writeLocalFile(upgrade.packageFile, newContent);
				valueReplaced = true;
				searchIndex += newValue.length - 1;
			} else if (newDigest && matchAt(newContent, searchIndex, currentDigest)) {
				logger.debug({
					packageFile,
					currentDigest
				}, `Found currentDigest at index ${searchIndex}`);
				if (digestReplaced) {
					startIndex = firstIndexOf(existingContent, depName, currentValue, startIndex + 1);
					searchIndex = startIndex - 1;
					await writeLocalFile(upgrade.packageFile, existingContent);
					newContent = existingContent;
					nameReplaced = !newName;
					valueReplaced = !newValue;
					digestReplaced = !newDigest;
					continue;
				}
				newContent = replaceAt(newContent, searchIndex, currentDigest, newDigest);
				await writeLocalFile(upgrade.packageFile, newContent);
				digestReplaced = true;
				searchIndex += newDigest.length - 1;
			}
			if (nameReplaced && valueReplaced && digestReplaced) {
				if (await confirmIfDepUpdated(upgrade, newContent)) return newContent;
				startIndex = firstIndexOf(existingContent, depName, currentValue, startIndex + 1);
				searchIndex = startIndex - 1;
				await writeLocalFile(upgrade.packageFile, existingContent);
				newContent = existingContent;
				nameReplaced = !newName;
				valueReplaced = !newValue;
				digestReplaced = !newDigest;
			}
		} else if (matchAt(newContent, searchIndex, replaceString)) {
			logger.debug({
				packageFile,
				depName
			}, `Found match at index ${searchIndex}`);
			newContent = replaceAt(newContent, searchIndex, replaceString, newString);
			await writeLocalFile(upgrade.packageFile, newContent);
			if (await confirmIfDepUpdated(upgrade, newContent)) return newContent;
			await writeLocalFile(upgrade.packageFile, existingContent);
			newContent = existingContent;
		}
	} catch (err) {
		/* istanbul ignore next */
		logger.debug({
			packageFile,
			depName,
			err
		}, "doAutoReplace error");
	}
	// istanbul ignore next
	throw new Error(WORKER_FILE_UPDATE_FAILED);
}
//#endregion
export { checkBranchDepsMatchBaseDeps, confirmIfDepUpdated, doAutoReplace };

//# sourceMappingURL=auto-replace.js.map