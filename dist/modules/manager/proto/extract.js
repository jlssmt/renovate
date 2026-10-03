import { logger } from "../../../logger/index.js";
import { ProtoToolsFile } from "./schema.js";
import { protoTooling } from "./upgradeable-tooling.js";
//#region lib/modules/manager/proto/extract.ts
/**
* Version aliases that cannot be updated via semver.
*/
const versionAliases = /* @__PURE__ */ new Set([
	"latest",
	"stable",
	"canary",
	"nightly"
]);
function extractPackageFile(content, packageFile) {
	logger.trace(`proto.extractPackageFile(${packageFile})`);
	const parsed = ProtoToolsFile.safeParse(content);
	if (!parsed.success) {
		logger.debug({
			err: parsed.error,
			packageFile
		}, "Error parsing proto .prototools file.");
		return null;
	}
	const { versions } = parsed.data;
	const deps = [];
	for (const [toolName, version] of Object.entries(versions)) deps.push(createDependency(toolName, version));
	return deps.length ? { deps } : null;
}
function createDependency(name, version) {
	if (versionAliases.has(version)) return {
		depName: name,
		currentValue: version,
		skipReason: "unsupported-version"
	};
	const config = getToolConfig(name);
	if (!config) return {
		depName: name,
		currentValue: version,
		skipReason: "unsupported-datasource"
	};
	return {
		depName: name,
		currentValue: version,
		...config
	};
}
function getToolConfig(toolName) {
	const toolDefinition = protoTooling[toolName];
	if (!toolDefinition) return null;
	return toolDefinition.config;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map