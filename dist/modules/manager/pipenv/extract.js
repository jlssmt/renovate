import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parse } from "../../../util/toml.js";
import { ensureLocalPath } from "../../../util/fs/util.js";
import { getParentDir, localPathExists } from "../../../util/fs/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { isArray, isObject, isString, isTruthy } from "@sindresorhus/is";
import { RANGE_PATTERN } from "@renovatebot/pep440";
import { pipenv } from "@renovatebot/detect-tools";
//#region lib/modules/manager/pipenv/extract.ts
const packagePattern = "[A-Z0-9]|[A-Z0-9][A-Z0-9._-]*[A-Z0-9]";
const extrasPattern = "(?:\\s*\\[[^\\]]+\\])*";
const packageRegex = regEx(`^(${packagePattern})(${extrasPattern})$`, "i");
const specifierPartPattern = `\\s*${RANGE_PATTERN.replace(regEx(/\?<\w+>/g), "?:")}\\s*`;
const specifierPattern = `${specifierPartPattern}(?:,${specifierPartPattern})*`;
const specifierRegex = regEx(`^${specifierPattern}$`);
function extractFromSection(sectionName, pipfileSection, sources) {
	return Object.entries(pipfileSection).map((x) => {
		const [packageNameString, requirements] = x;
		let depName = packageNameString;
		let currentValue;
		let nestedVersion = false;
		let skipReason;
		if (isObject(requirements)) {
			if (requirements.git) skipReason = "git-dependency";
			else if (requirements.file) skipReason = "file-dependency";
			else if (requirements.path) skipReason = "local-dependency";
			else if (requirements.version) {
				currentValue = requirements.version;
				nestedVersion = true;
			} else skipReason = "unspecified-version";
		} else currentValue = requirements;
		if (currentValue === "*") skipReason = "unspecified-version";
		if (!skipReason) {
			const packageMatches = packageRegex.exec(packageNameString);
			if (packageMatches) depName = packageMatches[1];
			else {
				logger.debug(`Skipping dependency with malformed package name "${packageNameString}".`);
				skipReason = "invalid-name";
			}
			if (!specifierRegex.exec(currentValue)) {
				logger.debug(`Skipping dependency with malformed version specifier "${currentValue}".`);
				skipReason = "invalid-version";
			}
		}
		const dep = {
			depType: sectionName,
			depName,
			packageName: normalizePythonDepName(depName),
			managerData: {}
		};
		if (currentValue) dep.currentValue = currentValue;
		if (skipReason) dep.skipReason = skipReason;
		else dep.datasource = PypiDatasource.id;
		if (!skipReason && currentValue?.startsWith("==")) dep.currentVersion = currentValue.replace(regEx(/^==\s*/), "");
		if (nestedVersion) dep.managerData.nestedVersion = nestedVersion;
		if (sources && isObject(requirements) && requirements.index) {
			const source = sources.find((item) => item.name === requirements.index);
			// v8 ignore else -- needs a requirement naming an index that is not declared
			if (source) dep.registryUrls = [source.url];
		}
		return dep;
	}).filter(isTruthy);
}
function isPipRequirements(section) {
	return !isArray(section) && isObject(section) && !Object.values(section).some((dep) => !isObject(dep) && !isString(dep));
}
async function extractPackageFile(content, packageFile) {
	logger.trace(`pipenv.extractPackageFile(${packageFile})`);
	let pipfile;
	try {
		pipfile = parse(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Error parsing Pipfile");
		return null;
	}
	const res = { deps: [] };
	const sources = pipfile?.source;
	if (sources) res.registryUrls = sources.map((source) => source.url);
	res.deps = Object.entries(pipfile).map(([category, section]) => {
		if (category === "source" || category === "requires" || !isPipRequirements(section)) return [];
		return extractFromSection(category, section, sources);
	}).flat();
	if (!res.deps.length) return null;
	const extractedConstraints = {};
	const pipfileDir = getParentDir(ensureLocalPath(packageFile));
	const pythonConstraint = await pipenv.getPythonConstraint(pipfileDir);
	if (pythonConstraint) extractedConstraints.python = pythonConstraint;
	const pipenvConstraint = await pipenv.getPipenvConstraint(pipfileDir);
	if (pipenvConstraint) extractedConstraints.pipenv = pipenvConstraint;
	const lockFileName = `${packageFile}.lock`;
	if (await localPathExists(lockFileName)) res.lockFiles = [lockFileName];
	res.extractedConstraints = extractedConstraints;
	return res;
}
//#endregion
export { extractPackageFile, extrasPattern, packagePattern };

//# sourceMappingURL=extract.js.map