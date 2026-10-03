import { newlineRegex, regEx } from "../../../../util/regex.js";
import { coerceString } from "../../../../util/string.js";
import { logger } from "../../../../logger/index.js";
import { getSiblingFileName } from "../../../../util/fs/index.js";
import { isDependencyString, versionLikeSubstring } from "../utils.js";
//#region lib/modules/manager/gradle/extract/consistent-versions-plugin.ts
const VERSIONS_PROPS = "versions.props";
const VERSIONS_LOCK = "versions.lock";
const LOCKFIlE_HEADER_TEXT = regEx(/^# Run \.\/gradlew (?:--write-locks|writeVersionsLock|writeVersionsLocks) to regenerate this file/);
/**
* Determines if Palantir gradle-consistent-versions is in use, https://github.com/palantir/gradle-consistent-versions.
* Both `versions.props` and `versions.lock` must exist and the special header line of lock file must match
*
* @param versionsPropsFilename is the full file name path of `versions.props`
* @param fileContents map with file contents of all files
*/
function usesGcv(versionsPropsFilename, fileContents) {
	return !!fileContents[getSiblingFileName(versionsPropsFilename, VERSIONS_LOCK)]?.match(LOCKFIlE_HEADER_TEXT);
}
/**
* Confirms whether the provided file name is the props file
*/
function isGcvPropsFile(fileName) {
	return fileName === "versions.props" || fileName.endsWith(`/versions.props`);
}
/**
* Confirms whether the provided file name is the lock file
*/
function isGcvLockFile(fileName) {
	return fileName === "versions.lock" || fileName.endsWith(`/versions.lock`);
}
/**
* Parses Gradle-Consistent-Versions files to figure out what dependencies, versions
* and groups they contain. The parsing goes like this:
* - Parse `versions.props` into deps (or groups) and versions, remembering file offsets
* - Parse `versions.lock` into deps and lock-versions
* - For each exact dep in props file, lookup the lock-version from lock file
* - For each group/regex dep in props file, lookup the set of exact deps and versions in lock file
*
* @param propsFileName name and path of the props file
* @param fileContents text content of all files
*/
function parseGcv(propsFileName, fileContents) {
	const propsFileContent = coerceString(fileContents[propsFileName]);
	const lockFileName = getSiblingFileName(propsFileName, VERSIONS_LOCK);
	const lockFileMap = parseLockFile(coerceString(fileContents[lockFileName]));
	const [propsFileExactMap, propsFileRegexMap] = parsePropsFile(propsFileContent);
	const extractedDeps = [];
	for (const [propDep, versionAndPosition] of propsFileExactMap)
 // v8 ignore else -- needs a props entry missing from the lock file
	if (lockFileMap.has(propDep)) {
		const newDep = {
			managerData: {
				packageFile: propsFileName,
				fileReplacePosition: versionAndPosition.filePos
			},
			depName: propDep,
			currentValue: versionAndPosition.version,
			lockedVersion: lockFileMap.get(propDep)?.version,
			depType: lockFileMap.get(propDep)?.depType
		};
		extractedDeps.push(newDep);
		lockFileMap.delete(propDep);
	}
	for (const [propDepGlob, propVerAndPos] of propsFileRegexMap) {
		const globRegex = globToRegex(propDepGlob);
		for (const [exactDep, lockVersionAndDepType] of lockFileMap) if (globRegex.test(exactDep)) {
			const newDep = {
				managerData: {
					packageFile: propsFileName,
					fileReplacePosition: propVerAndPos.filePos
				},
				depName: exactDep,
				currentValue: propVerAndPos.version,
				lockedVersion: lockVersionAndDepType.version,
				depType: lockVersionAndDepType.depType,
				sharedVariableName: propDepGlob
			};
			extractedDeps.push(newDep);
			lockFileMap.delete(exactDep);
		}
	}
	return extractedDeps;
}
function globToRegex(depName) {
	return regEx(depName.replace(regEx(/\*/g), "_WC_CHAR_").replace(regEx(/[/\-\\^$*+?.()|[\]{}]/g), "\\$&").replace(regEx(/_WC_CHAR_/g), ".*?"));
}
/**
* Parses `versions.lock`
*/
function parseLockFile(input) {
	const lockLineRegex = regEx(`^(?<depName>[^:]+:[^:]+):(?<lockVersion>[^ ]+) \\(\\d+ constraints: [0-9a-f]+\\)$`);
	const depVerMap = /* @__PURE__ */ new Map();
	let isTestDepType = false;
	for (const line of input.split(newlineRegex)) {
		const lineMatch = lockLineRegex.exec(line);
		if (lineMatch?.groups) {
			const { depName, lockVersion } = lineMatch.groups;
			if (isDependencyString(`${depName}:${lockVersion}`)) depVerMap.set(depName, {
				version: lockVersion,
				depType: isTestDepType ? "test" : "dependencies"
			});
		} else if (line === "[Test dependencies]") isTestDepType = true;
	}
	logger.trace(`Found ${depVerMap.size} locked dependencies in ${VERSIONS_LOCK}.`);
	return depVerMap;
}
/**
* Parses `versions.props`, this is CR/LF safe
* @param input the entire property file from file system
* @return two maps, first being exact matches, second regex matches
*/
function parsePropsFile(input) {
	const propsLineRegex = regEx(`^(?<depName>[^:]+:[^=]+?) *= *(?<propsVersion>.*)$`);
	const depVerExactMap = /* @__PURE__ */ new Map();
	const depVerRegexMap = /* @__PURE__ */ new Map();
	let startOfLineIdx = 0;
	const isCrLf = input.indexOf("\r\n") > 0;
	const validGlob = regEx(/^[a-zA-Z][-_a-zA-Z0-9.:*]+$/);
	for (const line of input.split(newlineRegex)) {
		const lineMatch = propsLineRegex.exec(line);
		if (lineMatch?.groups) {
			const { depName, propsVersion } = lineMatch.groups;
			if (validGlob.test(depName) && versionLikeSubstring(propsVersion) !== null) {
				const startPosInLine = line.lastIndexOf(propsVersion);
				const propVersionPos = startOfLineIdx + startPosInLine;
				if (depName.includes("*")) depVerRegexMap.set(depName, {
					version: propsVersion,
					filePos: propVersionPos
				});
				else depVerExactMap.set(depName, {
					version: propsVersion,
					filePos: propVersionPos
				});
			}
		}
		startOfLineIdx += line.length + (isCrLf ? 2 : 1);
	}
	logger.trace(`Found ${depVerExactMap.size} dependencies and ${depVerRegexMap.size} wildcard dependencies in ${VERSIONS_PROPS}.`);
	return [depVerExactMap, new Map([...depVerRegexMap].sort(([ka], [kb]) => ka.localeCompare(kb)).reverse())];
}
//#endregion
export { LOCKFIlE_HEADER_TEXT, VERSIONS_LOCK, VERSIONS_PROPS, isGcvLockFile, isGcvPropsFile, parseGcv, parseLockFile, parsePropsFile, usesGcv };

//# sourceMappingURL=consistent-versions-plugin.js.map