import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { api } from "../../versioning/deb/index.js";
import { DebDatasource } from "../../datasource/deb/index.js";
import { parseRunCommands } from "./run-command.js";
//#region lib/modules/manager/dockerfile/deb.ts
/**
* `apt` options which consume the following argument, so that the argument is
* not mistaken for a package name.
*
* Options given as `--opt=value` are a single token, so they need no entry here.
*/
const optionsWithValue = /* @__PURE__ */ new Set([
	"-o",
	"--option",
	"-c",
	"--config-file",
	"-t",
	"--target-release",
	"--default-release",
	"-a",
	"--host-architecture",
	"--build-profiles"
]);
/**
* An `apt` package specification, e.g. `curl`, `curl=8.5.0-2ubuntu10.6`,
* `curl:amd64=8.5.0-2ubuntu10.6` or `curl/bookworm-backports`.
*
* The `:arch` qualifier selects the architecture to install for, and the
* `/release` suffix picks the suite to install from - both are part of the
* spec rather than of the package name.
*/
const debSpecRegex = regEx(/^(?<name>[a-z0-9][a-z0-9+.-]*)(?::(?<arch>[a-z0-9][a-z0-9-]*))?(?:=(?<version>.+)|\/(?<release>[a-z0-9][\w.-]*))?$/);
function parseSpec(spec) {
	const groups = debSpecRegex.exec(spec)?.groups;
	if (!groups) {
		logger.trace({ spec }, "Skipping unparseable apt package spec");
		return null;
	}
	const { name, version } = groups;
	const dep = {
		datasource: DebDatasource.id,
		depName: name
	};
	if (!version) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	if (version.includes("$")) {
		dep.skipReason = "contains-variable";
		return dep;
	}
	if (!api.isSingleVersion(version)) {
		dep.skipReason = "unsupported-version";
		return dep;
	}
	dep.currentValue = version;
	dep.replaceString = spec;
	dep.autoReplaceStringTemplate = `${spec.slice(0, -version.length)}{{{newValue}}}`;
	return dep;
}
/** Package specs which are not registry lookups, and so are silently ignored */
function isIgnoredSpec(spec) {
	return spec.endsWith(".deb") || spec.startsWith(".") || spec.startsWith("/") || spec.endsWith("-") || spec.endsWith("+");
}
function extractAptInstallArgs(tokens) {
	const deps = [];
	let subCommandFound = false;
	for (let i = 0; i < tokens.length; i += 1) {
		const token = tokens[i];
		if (token.startsWith("-")) {
			if (optionsWithValue.has(token)) i += 1;
			continue;
		}
		if (!subCommandFound) {
			if (token !== "install") return [];
			subCommandFound = true;
			continue;
		}
		if (isIgnoredSpec(token)) {
			logger.trace({ spec: token }, "Skipping apt package spec");
			continue;
		}
		const dep = parseSpec(token);
		if (dep) deps.push(dep);
	}
	return deps;
}
/**
* Extracts Debian packages pinned by `apt install` or `apt-get install` in a
* `RUN` instruction, e.g.
*
* ```dockerfile
* RUN apt-get update && apt-get install -y --no-install-recommends \
*       curl=8.5.0-2ubuntu10.6 \
*       git=1:2.43.0-1ubuntu7.3
* ```
*
* @param instruction the full `RUN` instruction, including any line continuations
* @param escapeChar the Dockerfile escape character, already regex-escaped
*/
function extractDebDeps(instruction, escapeChar) {
	return parseRunCommands(instruction, escapeChar, ["apt", "apt-get"]).flatMap(extractAptInstallArgs);
}
//#endregion
export { extractDebDeps };

//# sourceMappingURL=deb.js.map