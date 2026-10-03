import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { keyValueExtractionRegex } from "./util.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/manager/tflint-plugin/plugins.ts
function extractTFLintPlugin(startingLine, lines, _pluginName) {
	let lineNumber = startingLine;
	const deps = [];
	let pluginSource = null;
	let currentVersion = null;
	let braceCounter = 0;
	do {
		// istanbul ignore if
		if (lineNumber > lines.length - 1) logger.debug(`Malformed TFLint configuration file detected.`);
		const line = lines[lineNumber];
		// istanbul ignore else
		if (isString(line)) {
			const openBrackets = coerceArray(line.match(regEx(/\{/g))).length;
			const closedBrackets = coerceArray(line.match(regEx(/\}/g))).length;
			braceCounter = braceCounter + openBrackets - closedBrackets;
			if (braceCounter === 1) {
				const kvMatch = keyValueExtractionRegex.exec(line);
				if (kvMatch?.groups) {
					if (kvMatch.groups.key === "version") currentVersion = kvMatch.groups.value;
					else if (kvMatch.groups.key === "source") pluginSource = kvMatch.groups.value;
				}
			}
		} else braceCounter = 0;
		lineNumber += 1;
	} while (braceCounter !== 0);
	const dep = analyseTFLintPlugin(pluginSource, currentVersion);
	deps.push(dep);
	lineNumber -= 1;
	return {
		lineNumber,
		dependencies: deps
	};
}
function analyseTFLintPlugin(source, version) {
	const dep = {};
	if (source) {
		dep.depType = "plugin";
		const sourceParts = source.split("/");
		if (sourceParts[0] === "github.com") {
			dep.currentValue = version;
			dep.datasource = GithubReleasesDatasource.id;
			dep.depName = sourceParts.slice(1).join("/");
		} else {
			dep.skipReason = "unsupported-datasource";
			dep.depName = source;
		}
	} else {
		logger.debug({ dep }, "tflint plugin has no source");
		dep.skipReason = "no-source";
	}
	return dep;
}
//#endregion
export { extractTFLintPlugin };

//# sourceMappingURL=plugins.js.map