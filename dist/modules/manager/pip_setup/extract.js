import { regEx } from "../../../util/regex.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { RANGE_PATTERN } from "@renovatebot/pep440";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/pip_setup/extract.ts
const python = lang.createLang("python");
function cleanupNamedGroups(regexSource) {
	return regexSource.replace(regEx(/\(\?<\w+>/g), "(?:");
}
const rangePattern = cleanupNamedGroups(RANGE_PATTERN);
const versionPattern = `(?:${rangePattern}(?:\\s*,\\s*${rangePattern})*)`;
const depNamePattern = "(?:[a-zA-Z][-_a-zA-Z0-9\\.]*[a-zA-Z0-9])";
const depPattern = [
	"^",
	`(?<depName>${depNamePattern})`,
	`(?<extra>(?:\\[\\s*(?:${depNamePattern}(?:\\s*,\\s*${depNamePattern})*\\s*)\\])?)`,
	`(?<currentValue>${versionPattern})`
].join("\\s*");
const extractRegex = regEx(depPattern);
function depStringHandler(ctx, token) {
	const depStr = token.value;
	const { depName, currentValue } = extractRegex.exec(depStr).groups;
	const dep = {
		depName,
		packageName: normalizePythonDepName(depName),
		currentValue,
		managerData: { lineNumber: token.line - 1 },
		datasource: PypiDatasource.id
	};
	if (currentValue?.startsWith("==")) dep.currentVersion = currentValue.replace(regEx(/^==\s*/), "");
	return {
		...ctx,
		deps: [...ctx.deps, dep]
	};
}
function depSkipHandler(ctx) {
	const dep = ctx.deps.at(-1);
	const deps = ctx.deps.slice(0, -1);
	deps.push({
		...dep,
		skipReason: "ignored"
	});
	return {
		...ctx,
		deps
	};
}
const incompleteDepString = query.str(regEx(cleanupNamedGroups(depPattern))).op(regEx(/^\+|\*$/));
const depString = query.str(regEx(cleanupNamedGroups(depPattern)), depStringHandler).opt(query.opt(query.op(",")).comment(regEx(/^#\s*renovate\s*:\s*ignore\s*$/), depSkipHandler));
const query$1 = query.alt(incompleteDepString, depString);
function extractPackageFile(content, _packageFile, _config) {
	const res = python.query(content, query$1, { deps: [] });
	return res?.deps?.length ? res : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map