import { coerceObject } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { matchRegexOrGlob } from "../../../util/string-match.js";
import { logger } from "../../../logger/index.js";
import { ensureCacheDir, localPathExists, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { resolveToolConstraint } from "../util.js";
import { PNPM_CACHE_DIR, PNPM_STORE_DIR } from "./constants.js";
import { getNodeToolConstraint } from "./post-update/node-version.js";
import { processHostRules } from "./post-update/rules.js";
import { withNpmrcHostRules } from "./utils.js";
import { lazyLoadPackageJson } from "./post-update/utils.js";
import { isEmptyArray, isNonEmptyObject, isString } from "@sindresorhus/is";
import { isScalar, isSeq, parseDocument } from "yaml";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/npm/artifacts.ts
const versionWithHashRegString = "^(?<version>.*)\\+(?<hash>.*)";
async function updateArtifacts(updateArtifactsConfig) {
	logger.debug(`npm.updateArtifacts(${updateArtifactsConfig.packageFileName})`);
	let res = [];
	res.push(coerceObject(await handlePackageManagerUpdates(updateArtifactsConfig)));
	res.push(coerceObject(await updatePnpmWorkspace(updateArtifactsConfig)));
	res = res.filter(isNonEmptyObject);
	if (res.length === 0) return null;
	return res;
}
async function handlePackageManagerUpdates(updateArtifactsConfig) {
	const { packageFileName, config, updatedDeps, newPackageFileContent: existingPackageFileContent } = updateArtifactsConfig;
	const packageManagerUpdate = updatedDeps.find((dep) => dep.depType === "packageManager");
	if (!packageManagerUpdate) {
		logger.debug("No packageManager updates - returning null");
		return null;
	}
	const { currentValue, depName, newVersion } = packageManagerUpdate;
	if (!currentValue || !regEx(versionWithHashRegString).test(currentValue)) return null;
	await writeLocalFile(packageFileName, existingPackageFileContent);
	const pkgFileDir = upath.dirname(packageFileName);
	const { additionalNpmrcContent } = processHostRules();
	const lazyPkgJson = lazyLoadPackageJson(pkgFileDir);
	const cmd = `corepack use ${quote(`${depName}@${newVersion}`)}`;
	const nodeConstraints = await getNodeToolConstraint(config, updatedDeps, pkgFileDir, lazyPkgJson);
	const pnpmConfigCacheDir = await ensureCacheDir(PNPM_CACHE_DIR);
	const pnpmConfigStoreDir = await ensureCacheDir(PNPM_STORE_DIR);
	const execOptions = {
		cwdFile: packageFileName,
		extraEnv: {
			npm_config_cache_dir: pnpmConfigCacheDir,
			npm_config_store_dir: pnpmConfigStoreDir,
			pnpm_config_cache_dir: pnpmConfigCacheDir,
			pnpm_config_store_dir: pnpmConfigStoreDir
		},
		toolConstraints: [nodeConstraints, {
			toolName: "corepack",
			constraint: await resolveToolConstraint(config, "corepack")
		}],
		docker: {}
	};
	return await withNpmrcHostRules(pkgFileDir, additionalNpmrcContent, async () => {
		try {
			await exec(cmd, execOptions);
			const newPackageFileContent = await readLocalFile(packageFileName, "utf8");
			if (!newPackageFileContent || existingPackageFileContent === newPackageFileContent) return null;
			logger.debug("Returning updated package.json");
			return { file: {
				type: "addition",
				path: packageFileName,
				contents: newPackageFileContent
			} };
		} catch (err) {
			logger.warn({ err }, "Error updating package.json");
			return { artifactError: {
				fileName: packageFileName,
				stderr: err.message
			} };
		}
	});
}
/**
* Update the minimumReleaseAgeExclude setting in pnpm-workspace.yaml if needed
*/
async function updatePnpmWorkspace(updateArtifactsConfig) {
	const upgrades = updateArtifactsConfig.updatedDeps.filter((u) => u.isVulnerabilityAlert);
	if (isEmptyArray(upgrades)) return null;
	const pnpmLockFile = upgrades[0].managerData?.pnpmLockFile;
	if (!isString(pnpmLockFile)) {
		logger.debug("No pnpm shrinkwrap found, not attempting to update pnpm-workspace.yaml");
		return null;
	}
	const lockFileDir = upath.dirname(pnpmLockFile);
	const pnpmWorkspaceFilePath = upath.join(lockFileDir, "pnpm-workspace.yaml");
	if (!await localPathExists(pnpmWorkspaceFilePath)) return null;
	const packageFileContent = updateArtifactsConfig.packageFileName === pnpmWorkspaceFilePath ? updateArtifactsConfig.newPackageFileContent : await readLocalFile(pnpmWorkspaceFilePath, "utf8");
	const doc = parseDocument(packageFileContent);
	if (!doc.get("minimumReleaseAge")) return null;
	let updated = false;
	for (const upgrade of upgrades) {
		let excludeNode = doc.getIn(["minimumReleaseAgeExclude"]);
		// v8 ignore next -- TODO: add test #40625
		const newVersion = upgrade.newVersion ?? upgrade.newValue;
		const excludeDepName = upgrade.packageName ?? upgrade.depName;
		/* v8 ignore if -- should not happen, adding for type narrowing*/
		if (excludeNode && !isSeq(excludeNode)) return null;
		if (!excludeNode) {
			logger.debug("Adding new exclude block");
			excludeNode = doc.createNode([]);
			const newItem = doc.createNode(`${excludeDepName}@${newVersion}`);
			newItem.commentBefore = ` Renovate security update: ${excludeDepName}@${newVersion}`;
			excludeNode.items.push(newItem);
			doc.set("minimumReleaseAgeExclude", excludeNode);
			updated = true;
			continue;
		}
		const { item: matchedItem, allExcluded, malformed } = getMatchedItem(excludeDepName, excludeNode.items);
		if (allExcluded) {} else if (malformed && isScalar(matchedItem)) {
			logger.debug({
				entry: matchedItem.value,
				excludeDepName,
				newVersion
			}, "Replacing malformed minimumReleaseAgeExclude entry");
			matchedItem.value = `${excludeDepName}@${newVersion}`;
			matchedItem.commentBefore = ` Renovate security update: ${excludeDepName}@${newVersion}`;
			updated = true;
		} else if (isScalar(matchedItem)) {
			if (excludeNode?.commentBefore?.includes(`${excludeDepName}@`)) {
				if (!minimumReleaseAgeExcludeIncludesDepNameAndVersion(excludeNode.commentBefore, excludeDepName, newVersion)) {
					excludeNode.commentBefore = `${excludeNode.commentBefore} || ${newVersion}`;
					updated = true;
				}
			} else if (matchedItem.commentBefore) {
				if (!minimumReleaseAgeExcludeIncludesDepNameAndVersion(matchedItem.commentBefore, excludeDepName, newVersion)) {
					matchedItem.commentBefore = `${matchedItem.commentBefore} || ${newVersion}`;
					updated = true;
				}
			} else {
				matchedItem.commentBefore = ` Renovate security update: ${excludeDepName}@${newVersion}`;
				updated = true;
			}
			if (!minimumReleaseAgeExcludeIncludesDepNameAndVersion(matchedItem.value, excludeDepName, newVersion)) {
				matchedItem.value = `${matchedItem.value} || ${newVersion}`;
				updated = true;
			}
		} else {
			const newItem = doc.createNode(`${excludeDepName}@${newVersion}`);
			newItem.commentBefore = ` Renovate security update: ${excludeDepName}@${newVersion}`;
			excludeNode.items.push(newItem);
			updated = true;
		}
		for (let i = excludeNode.items.length - 1; i >= 0; i--) {
			const item = excludeNode.items[i];
			if (item !== matchedItem && isScalar(item) && isString(item.value) && item.value.startsWith(`${excludeDepName}@`) && !isValidMinimumReleaseAgeExcludeEntry(item.value, excludeDepName)) {
				excludeNode.items.splice(i, 1);
				updated = true;
			}
		}
	}
	if (!updated) return null;
	const newContent = doc.toString();
	await writeLocalFile(pnpmWorkspaceFilePath, newContent);
	return { file: {
		type: "addition",
		path: pnpmWorkspaceFilePath,
		contents: newContent
	} };
}
function getMatchedItem(depName, items) {
	let malformedItem = null;
	for (const item of items) {
		/* v8 ignore if -- should not happen */
		if (!isScalar(item) || !isString(item.value)) continue;
		if (item.value.startsWith(`${depName}@`)) {
			if (isValidMinimumReleaseAgeExcludeEntry(item.value, depName)) return {
				allExcluded: false,
				item
			};
			malformedItem ??= item;
			continue;
		}
		if (item.value === depName || matchRegexOrGlob(depName, item.value)) return {
			allExcluded: true,
			item
		};
	}
	if (malformedItem) return {
		allExcluded: false,
		item: malformedItem,
		malformed: true
	};
	return {
		item: null,
		allExcluded: false
	};
}
/** pnpm requires package@version entries without range selectors or extra @ in the version part */
function isValidMinimumReleaseAgeExcludeEntry(value, packageName) {
	return !value.slice(`${packageName}@`.length).includes("@");
}
/** determine whether a comment or a list item contains the depName at a given newVersion */
function minimumReleaseAgeExcludeIncludesDepNameAndVersion(line, depName, newVersion) {
	if (line.includes(`${depName}@${newVersion}`)) return true;
	if (line.includes(`|| ${newVersion}`)) return true;
	return false;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map