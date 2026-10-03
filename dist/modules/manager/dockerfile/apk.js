import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { api } from "../../versioning/apk/index.js";
import { ApkDatasource } from "../../datasource/apk/index.js";
import { parseRunCommands } from "./run-command.js";
//#region lib/modules/manager/dockerfile/apk.ts
/**
* `apk` options which consume the following argument, so that the argument is
* not mistaken for a package name.
*
* Options given as `--opt=value` are a single token, so they need no entry here.
*/
const optionsWithValue = /* @__PURE__ */ new Set([
	"-X",
	"--repository",
	"-t",
	"--virtual",
	"-p",
	"--root",
	"--arch",
	"--cache-dir",
	"--cache-max-age",
	"--keys-dir",
	"--repositories-file",
	"--progress-fd",
	"--timeout",
	"--wait"
]);
/**
* An `apk` package specification, e.g. `bash`, `bash=5.2.37-r2`, `bash>5.2` or
* `nodejs@edge=22.13.1-r0`.
*
* `apk` builds the constraint operator from its characters, so they may be
* given in any order and may repeat - see the `apk` versioning module.
*
* The `@repoTag` suffix pins the package to a tagged repository from
* `/etc/apk/repositories`, and is part of the spec rather than of the name.
*/
const apkSpecRegex = regEx(/^(?<name>[a-zA-Z0-9][\w.+-]*)(?:@(?<repoTag>[\w.-]+))?(?:(?<operator>[<>=~]+)(?<version>.+))?$/);
function parseSpec(spec) {
	const groups = apkSpecRegex.exec(spec)?.groups;
	if (!groups) {
		logger.trace({ spec }, "Skipping unparseable apk package spec");
		return null;
	}
	const { name, operator, version } = groups;
	const dep = {
		datasource: ApkDatasource.id,
		depName: name
	};
	if (!operator) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	if (version.includes("$")) {
		dep.skipReason = "contains-variable";
		return dep;
	}
	const constraint = operator + version;
	if (!api.isValid(constraint)) {
		dep.skipReason = "unsupported-version";
		return dep;
	}
	const currentValue = api.isSingleVersion(constraint) ? version : constraint;
	dep.currentValue = currentValue;
	dep.replaceString = spec;
	dep.autoReplaceStringTemplate = `${spec.slice(0, -currentValue.length)}{{{newValue}}}`;
	return dep;
}
/** Package specs which are not registry lookups, and so are silently ignored */
function isIgnoredSpec(spec) {
	return spec.startsWith("!") || spec.startsWith(".") || spec.includes("/") || spec.includes(":");
}
function extractApkAddArgs(tokens) {
	const deps = [];
	let subCommandFound = false;
	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.startsWith("-")) {
			if (optionsWithValue.has(token)) i += 1;
			continue;
		}
		if (!subCommandFound) {
			if (token !== "add") return [];
			subCommandFound = true;
			continue;
		}
		if (isIgnoredSpec(token)) {
			logger.trace({ spec: token }, "Skipping apk package spec");
			continue;
		}
		const dep = parseSpec(token);
		if (dep) deps.push(dep);
	}
	return deps;
}
/**
* Extracts APK packages pinned by `apk add` in a `RUN` instruction, e.g.
*
* ```dockerfile
* RUN apk add --no-cache \
*       bash=5.2.37-r2 \
*       rsyslog=8.2412.0-r1
* ```
*
* @param instruction the full `RUN` instruction, including any line continuations
* @param escapeChar the Dockerfile escape character, already regex-escaped
*/
function extractApkDeps(instruction, escapeChar) {
	return parseRunCommands(instruction, escapeChar, ["apk"]).flatMap(extractApkAddArgs);
}
//#endregion
export { extractApkDeps };

//# sourceMappingURL=apk.js.map