import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { checkFileContainsPlugins } from "./util.js";
import { extractTFLintPlugin } from "./plugins.js";
//#region lib/modules/manager/tflint-plugin/extract.ts
const dependencyBlockExtractionRegex = regEx(/^\s*plugin\s+"(?<pluginName>[^"]+)"\s+{\s*$/);
function extractPackageFile(content, packageFile, _config) {
	logger.trace({ content }, `tflint.extractPackageFile(${packageFile})`);
	if (!checkFileContainsPlugins(content)) {
		logger.debug({ packageFile }, "preflight content check has not found any relevant content");
		return null;
	}
	let deps = [];
	try {
		const lines = content.split(newlineRegex);
		for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
			const line = lines[lineNumber];
			const tfLintPlugin = dependencyBlockExtractionRegex.exec(line);
			if (tfLintPlugin?.groups) {
				logger.trace(`Matched TFLint plugin on line ${lineNumber}`);
				let result = null;
				result = extractTFLintPlugin(lineNumber, lines, tfLintPlugin.groups.pluginName);
				// v8 ignore else -- `extractTFLintPlugin()` always returns a result
				if (result) {
					lineNumber = result.lineNumber;
					deps = deps.concat(result.dependencies);
					result = null;
				}
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting TFLint plugins");
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map