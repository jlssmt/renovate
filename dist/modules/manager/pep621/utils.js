import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { isNonEmptyString, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/pep621/utils.ts
const pep508Regex = regEx(/^(?<packageName>[A-Z0-9._-]+)\s*(?:\[(?<extras>[A-Z0-9\s,._-]+)\])?\s*(?<currentValue>[^;]+)?(?:;\s*(?<marker>.*))?/i);
const depTypes = {
	dependencies: "project.dependencies",
	optionalDependencies: "project.optional-dependencies",
	dependencyGroups: "dependency-groups",
	pdmDevDependencies: "tool.pdm.dev-dependencies",
	uvDevDependencies: "tool.uv.dev-dependencies",
	uvSources: "tool.uv.sources",
	buildSystemRequires: "build-system.requires"
};
function parsePEP508(value) {
	if (isNullOrUndefined(value)) return null;
	const regExpExec = pep508Regex.exec(value);
	if (isNullOrUndefined(regExpExec) || isNullOrUndefined(regExpExec?.groups)) {
		logger.trace(`Pep508 could not be extracted`);
		return null;
	}
	const result = { packageName: regExpExec.groups.packageName };
	if (isNonEmptyString(regExpExec.groups.currentValue)) {
		if (regExpExec.groups.currentValue.startsWith("(") && regExpExec.groups.currentValue.endsWith(")")) result.currentValue = regExpExec.groups.currentValue.slice(1, -1).trim();
		else result.currentValue = regExpExec.groups.currentValue;
	}
	if (isNonEmptyString(regExpExec.groups.marker)) result.marker = regExpExec.groups.marker;
	if (isNonEmptyString(regExpExec.groups.extras)) result.extras = regExpExec.groups.extras.split(",").map((e) => e.trim());
	return result;
}
function pep508ToPackageDependency(depType, value) {
	const parsed = parsePEP508(value);
	if (isNullOrUndefined(parsed)) return null;
	const dep = {
		packageName: normalizePythonDepName(parsed.packageName),
		depName: parsed.packageName,
		datasource: PypiDatasource.id,
		depType
	};
	if (isNullOrUndefined(parsed.currentValue)) dep.skipReason = "unspecified-version";
	else {
		dep.currentValue = parsed.currentValue;
		if (parsed.currentValue.startsWith("==")) dep.currentVersion = parsed.currentValue.replace(regEx(/^==\s*/), "");
	}
	return dep;
}
//#endregion
export { depTypes, parsePEP508, pep508ToPackageDependency };

//# sourceMappingURL=utils.js.map