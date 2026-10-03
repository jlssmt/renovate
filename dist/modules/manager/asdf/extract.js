import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isSkipComment } from "../../../util/ignore.js";
import { upgradeableTooling } from "./upgradeable-tooling.js";
import { isFunction, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/asdf/extract.ts
function extractPackageFile(content) {
	logger.trace(`asdf.extractPackageFile()`);
	const regex = regEx(/^(?<toolName>(?:[\w_-]+)) +(?<version>[^\s#]+)(?: +[^\s#]+)* *(?: #(?<comment>.*))?$/gm);
	const deps = [];
	for (const groups of [...content.matchAll(regex)].map((m) => m.groups).filter(isTruthy)) {
		const depName = groups.toolName.trim();
		const version = groups.version.trim();
		const toolConfig = upgradeableTooling[depName];
		let toolDefinition;
		if (toolConfig) toolDefinition = isFunction(toolConfig.config) ? toolConfig.config(version) : toolConfig.config;
		if (toolDefinition) {
			const dep = {
				currentValue: version,
				depName,
				...toolDefinition
			};
			if (isSkipComment((groups.comment ?? "").trim())) dep.skipReason = "ignored";
			deps.push(dep);
		} else {
			const dep = {
				depName,
				skipReason: "unsupported-datasource"
			};
			deps.push(dep);
		}
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map