import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { findHandler } from "./handlers/index.js";
import { extractRubyString } from "./utils.js";
//#region lib/modules/manager/homebrew/extract.ts
function extractPackageFile(content) {
	logger.trace("extractPackageFile()");
	const classRegex = regEx(/\bclass\s+(?<className>\w+)\s*<\s*Formula\b/);
	const classMatch = content.match(classRegex);
	if (!classMatch?.groups) {
		logger.debug("Invalid class definition");
		return null;
	}
	const className = classMatch.groups.className;
	const url = extractRubyString(content, "url");
	const sha256 = extractRubyString(content, "sha256");
	if (!sha256 || sha256?.length !== 64) {
		logger.debug("Error: Invalid sha256 field");
		return { deps: [{
			depName: className,
			skipReason: "invalid-sha256"
		}] };
	}
	const result = findHandler(url);
	if (!result) {
		logger.debug("Error: Unsupported URL field");
		return { deps: [{
			depName: className,
			skipReason: "unsupported-url"
		}] };
	}
	return { deps: [result.handler.createDependency(result.parsed, sha256, url)] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map