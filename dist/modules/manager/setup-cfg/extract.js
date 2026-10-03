import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { RANGE_PATTERN } from "@renovatebot/pep440";
//#region lib/modules/manager/setup-cfg/extract.ts
function getSectionName(str) {
	const [, sectionName] = coerceArray(regEx(/^\[\s*(?<sectionName>[^\s]+)\s*]\s*$/).exec(str));
	return sectionName;
}
function getSectionRecord(str) {
	const [, sectionRecord] = coerceArray(regEx(/^(?<sectionRecord>[^\s]+)\s*=/).exec(str));
	return sectionRecord;
}
function getDepType(section, record) {
	if (section === "options") {
		if (record === "install_requires") return "install";
		if (record === "setup_requires") return "setup";
		if (record === "tests_require") return "test";
	}
	if (section === "options.extras_require") return "extra";
	return null;
}
function parseDep(line, section, record) {
	const packagePattern = "[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]";
	const extrasPattern = "(?:\\s*\\[[^\\]]+\\])?";
	const specifierPartPattern = `\\s*${RANGE_PATTERN.replace(regEx(/\?<\w+>/g), "?:")}`;
	const dependencyPattern = `(${packagePattern})(${extrasPattern})(${`${specifierPartPattern}(?:\\s*,${specifierPartPattern})*`})`;
	const pkgRegex = regEx(`^(${packagePattern})$`);
	const pkgValRegex = regEx(`^${dependencyPattern}$`);
	const depType = getDepType(section, record);
	if (!depType) return null;
	const [lineNoEnvMarkers] = line.split(";").map((part) => part.trim());
	const packageMatches = pkgValRegex.exec(lineNoEnvMarkers) ?? pkgRegex.exec(lineNoEnvMarkers);
	if (!packageMatches) return null;
	const [, depName, , currVal] = packageMatches;
	const currentValue = currVal?.trim();
	const dep = {
		depName,
		packageName: normalizePythonDepName(depName),
		currentValue,
		datasource: PypiDatasource.id,
		depType
	};
	if (currentValue?.startsWith("==")) dep.currentVersion = currentValue.replace(regEx(/^==\s*/), "");
	return dep;
}
function extractPackageFile(content) {
	logger.trace("setup-cfg.extractPackageFile()");
	let sectionName = null;
	let sectionRecord = null;
	const deps = [];
	content.split(newlineRegex).map((line) => line.replace(regEx(/#.*$/), "").trimEnd()).forEach((rawLine) => {
		let line = rawLine;
		const newSectionName = getSectionName(line);
		const newSectionRecord = getSectionRecord(line);
		if (newSectionName) sectionName = newSectionName;
		if (newSectionRecord) {
			sectionRecord = newSectionRecord;
			line = rawLine.replace(regEx(/^[^=]*=\s*/), "");
			line.split(";").forEach((part) => {
				const dep = parseDep(part, sectionName, sectionRecord);
				if (dep) deps.push(dep);
			});
			return;
		}
		const dep = parseDep(line, sectionName, sectionRecord);
		if (dep) deps.push(dep);
	});
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map