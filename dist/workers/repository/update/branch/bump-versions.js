import { regEx } from "../../../../util/regex.js";
import { coerceArray } from "../../../../util/array.js";
import { matchRegexOrGlobList } from "../../../../util/string-match.js";
import { safeStringify } from "../../../../util/stringify.js";
import { logger } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { getFilteredFileList } from "../../extract/file-match.js";
import { inc } from "semver";
//#region lib/workers/repository/update/branch/bump-versions.ts
async function bumpVersions(config) {
	const bumpVersions = getBumpVersions(config);
	if (!bumpVersions.length) return;
	if (!config.updatedPackageFiles?.length && !config.updatedArtifacts?.length) return;
	const allFiles = await scm.getFileList();
	const fileList = getFilteredFileList(config, allFiles);
	const packageFileChanges = fileChangeListToMap(config.updatedPackageFiles);
	const artifactFileChanges = fileChangeListToMap(config.updatedArtifacts);
	for (const bumpVersionConfig of bumpVersions) await bumpVersion(bumpVersionConfig, config, fileList, packageFileChanges, artifactFileChanges);
	config.updatedPackageFiles = Object.values(packageFileChanges).flat();
	config.updatedArtifacts = Object.values(artifactFileChanges).flat();
}
/**
* `config.bumpVersions` is derived from `upgrades[0]` only (see `generateBranchConfig()`), so
* relying on it alone would silently drop `bumpVersions` config attached (e.g. via a `packageRule`)
* to any upgrade other than the first one in the branch. Collect `bumpVersions` from every
* upgrade instead, de-duplicating identical entries, and fall back to the top-level value for
* back-compat (e.g. when `config.upgrades` is empty).
*/
function getBumpVersions(config) {
	const seen = /* @__PURE__ */ new Set();
	const bumpVersions = [];
	for (const upgrade of coerceArray(config.upgrades)) for (const bumpVersionConfig of coerceArray(upgrade.bumpVersions)) {
		const key = safeStringify(bumpVersionConfig);
		if (!seen.has(key)) {
			seen.add(key);
			bumpVersions.push(bumpVersionConfig);
		}
	}
	if (!bumpVersions.length) bumpVersions.push(...coerceArray(config.bumpVersions));
	return bumpVersions;
}
async function bumpVersion(config, branchConfig, fileList, packageFiles, artifactFiles) {
	const rawBumpType = config.bumpType ?? "patch";
	const bumpVersionsDescr = config.name ? `bumpVersions(${config.name})` : "bumpVersions";
	const files = [];
	try {
		files.push(...getMatchedFiles(bumpVersionsDescr, config.filePatterns, branchConfig, fileList));
	} catch (e) {
		addArtifactError(branchConfig, `Failed to calculate matched files for bumpVersions: ${e.message}`);
		return;
	}
	if (!files.length) {
		logger.debug(`${bumpVersionsDescr}: filePatterns did not match any files`);
		return;
	}
	logger.trace({ files }, `${bumpVersionsDescr}: Found ${files.length} files to bump versions`);
	const matchStrings = [];
	const matchStringsRegexes = [];
	for (const matchString of config.matchStrings) try {
		const templated = compile(matchString, branchConfig);
		matchStrings.push(templated);
		matchStringsRegexes.push(regEx(templated));
	} catch (e) {
		addArtifactError(branchConfig, `Failed to compile matchString for ${bumpVersionsDescr}: ${e.message}`, matchString);
	}
	logger.trace({ matchStrings }, `${bumpVersionsDescr}: Compiled matchStrings`);
	for (const filePath of files) {
		let fileBumped = false;
		const fileContents = await getFileContent(bumpVersionsDescr, filePath, packageFiles, artifactFiles);
		if (!fileContents) continue;
		for (const matchStringRegex of matchStringsRegexes) {
			const regexResult = matchStringRegex.exec(fileContents);
			if (!regexResult) continue;
			const version = regexResult.groups?.version;
			if (!version) {
				logger.debug({ file: filePath }, `${bumpVersionsDescr}: No version found`);
				continue;
			}
			let newVersion = null;
			try {
				const bumpType = compile(rawBumpType, branchConfig);
				if (bumpType === "sync") {
					if (branchConfig.upgrades?.length) {
						newVersion = branchConfig.upgrades[0].newVersion ?? null;
						if (!newVersion) {
							logger.debug({ file: filePath }, `${bumpVersionsDescr}: No newVersion found in branch upgrades for sync type`);
							continue;
						}
					} else {
						logger.debug({ file: filePath }, `${bumpVersionsDescr}: No upgrades found in branch config for sync type`);
						continue;
					}
				} else {
					const parts = regEx("^(?<major>\\d+)(?:\\.(?<minor>\\d+))?$").exec(version);
					if (parts?.groups) {
						const { major, minor } = parts.groups;
						if (bumpType === "major") newVersion = `${parseInt(major, 10) + 1}${minor ? `.0` : ""}`;
						else if (bumpType === "minor") newVersion = `${major}.${parseInt(minor, 10) + 1}`;
						else throw new Error(`Unsupported bump type for {major}.{minor} version: ${bumpType}`);
					} else newVersion = inc(version, bumpType);
				}
			} catch (e) {
				addArtifactError(branchConfig, `Failed to calculate new version for ${bumpVersionsDescr}: ${e.message}`, filePath);
			}
			if (!newVersion) {
				logger.debug({ file: filePath }, `${bumpVersionsDescr}: Could not bump version`);
				continue;
			}
			const newFileContents = fileContents.toString().replace(matchStringRegex, (match, ...groups) => {
				const { version } = groups.pop();
				return match.replace(version, newVersion);
			});
			if (packageFiles[filePath]) packageFiles[filePath].push({
				type: "addition",
				path: filePath,
				contents: newFileContents
			});
			else {
				artifactFiles[filePath] ??= [];
				artifactFiles[filePath].push({
					type: "addition",
					path: filePath,
					contents: newFileContents
				});
			}
			fileBumped = true;
		}
		if (!fileBumped) logger.debug({ file: filePath }, `${bumpVersionsDescr}: No match found for bumping version`);
	}
}
/**
* Get files that match ANY of the fileMatches pattern. fileMatches are compiled with the branchConfig.
* @param bumpVersionsDescr log description for the bump version config
* @param filePatternTemplates list of regex patterns
* @param branchConfig compile metadata
* @param fileList list of files to match against
*/
function getMatchedFiles(bumpVersionsDescr, filePatternTemplates, branchConfig, fileList) {
	const filePatterns = [];
	for (const filePatternTemplateElement of filePatternTemplates) {
		const filePattern = compile(filePatternTemplateElement, branchConfig);
		filePatterns.push(filePattern);
	}
	logger.trace({ filePatterns }, `${bumpVersionsDescr}: Compiled filePatterns`);
	const files = [];
	for (const file of fileList) if (matchRegexOrGlobList(file, filePatterns)) files.push(file);
	return files;
}
function fileChangeListToMap(list) {
	const record = {};
	for (const fileChange of coerceArray(list)) {
		record[fileChange.path] ??= [];
		record[fileChange.path].push(fileChange);
	}
	return record;
}
function addArtifactError(branchConfig, message, fileName) {
	branchConfig.artifactErrors ??= [];
	branchConfig.artifactErrors.push({
		stderr: message,
		fileName
	});
}
async function getFileContent(bumpVersionsDescr, filePath, packageFiles, artifactFiles) {
	const packageFileChanges = parseFileChanges(filePath, packageFiles);
	const artifactFileChanges = parseFileChanges(filePath, artifactFiles);
	if (packageFileChanges.state === "deleted" || artifactFileChanges.state === "deleted") return null;
	if (packageFileChanges.state === "modified") {
		const lastChange = packageFileChanges.content;
		if (lastChange) return lastChange;
	}
	if (artifactFileChanges.state === "modified") {
		const lastChange = artifactFileChanges.content;
		if (lastChange) return lastChange;
	}
	try {
		return await readLocalFile(filePath, "utf8");
	} catch (e) {
		logger.warn({
			file: filePath,
			bumpVersionsDescr,
			err: e
		}, "bumpVersions: Could not read file");
		return null;
	}
}
function parseFileChanges(filePath, changeRecord) {
	const changes = coerceArray(changeRecord[filePath]);
	if (!changes.length) return { state: "unmodified" };
	const lastChange = changes.at(-1);
	if (lastChange.type === "deletion") return { state: "deleted" };
	return {
		state: "modified",
		content: lastChange.contents?.toString() ?? null
	};
}
//#endregion
export { bumpVersions };

//# sourceMappingURL=bump-versions.js.map