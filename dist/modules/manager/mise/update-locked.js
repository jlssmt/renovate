import { regEx } from "../../../util/regex.js";
import { safeStringify } from "../../../util/stringify.js";
import { logger } from "../../../logger/index.js";
import { parseTOMLDocument } from "../../../util/toml.js";
import { getLockedTool } from "./lockfile.js";
import { MiseLockFile } from "./schema.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/mise/update-locked.ts
const versionPrefixRegex = regEx(/^(?<prefix>[^\d]*)\d/);
function getToolName(depName, lockFileData) {
	if (lockFileData.tools[depName]) return depName;
	const delimiterIndex = depName.indexOf(":");
	if (delimiterIndex !== -1) {
		const shortName = depName.substring(delimiterIndex + 1);
		if (lockFileData.tools[shortName]) return shortName;
	}
	return "";
}
function formatLockedVersion(currentVersion, newVersion) {
	const currentPrefix = versionPrefixRegex.exec(currentVersion)?.groups?.prefix ?? "";
	const newPrefix = versionPrefixRegex.exec(newVersion)?.groups?.prefix;
	if (newPrefix !== void 0) return `${currentPrefix}${newVersion.slice(newPrefix.length)}`;
	return newVersion;
}
function getVersionKeyValue(key) {
	if (key.keys.length !== 1) return;
	const [part] = key.keys;
	return part.type === "TOMLBare" ? part.name : part.value;
}
function getVersionValueNode(content, depName, lockFileData, currentVersion, newVersion) {
	const toolName = getToolName(depName, lockFileData);
	const lockedTools = getLockedTool(lockFileData, depName);
	if (!toolName || !lockedTools?.length) return;
	const toolIndex = lockedTools.length === 1 ? 0 : lockedTools.findIndex(({ version }) => version === currentVersion || formatLockedVersion(version, currentVersion) === version || version === newVersion || formatLockedVersion(version, newVersion) === version);
	if (toolIndex === -1) return;
	const versionKeyValue = astTableForTool(content, toolName, toolIndex)?.body.find((keyValue) => getVersionKeyValue(keyValue.key) === "version");
	if (versionKeyValue?.value.type !== "TOMLValue") return;
	return {
		currentLockedVersion: lockedTools[toolIndex].version,
		versionNode: versionKeyValue.value
	};
}
function astTableForTool(content, toolName, toolIndex) {
	return parseTOMLDocument(content).body[0]?.body.find((node) => node.type === "TOMLTable" && node.kind === "array" && node.resolvedKey.length === 3 && node.resolvedKey[0] === "tools" && node.resolvedKey[1] === toolName && node.resolvedKey[2] === toolIndex);
}
function updateLockedDependency(config) {
	const { depName, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`mise.updateLockedDependency: ${depName} -> ${newVersion} [${lockFile}]`);
	if (!depName || !lockFileContent) return { status: "unsupported" };
	try {
		const parsed = MiseLockFile.safeParse(lockFileContent);
		if (!parsed.success) return { status: "unsupported" };
		const lockedVersion = getVersionValueNode(lockFileContent, depName, parsed.data, config.currentVersion, newVersion);
		if (!lockedVersion) return { status: "unsupported" };
		const { currentLockedVersion: currentVersionValue, versionNode } = lockedVersion;
		const currentLockedVersion = lockFileContent.slice(versionNode.range[0], versionNode.range[1]);
		const updatedVersion = formatLockedVersion(currentVersionValue, newVersion);
		if (currentVersionValue === updatedVersion) return { status: "already-updated" };
		const replacement = (currentLockedVersion.startsWith("'") ? "'" : "\"") === "'" ? `'${updatedVersion}'` : safeStringify(updatedVersion);
		const files = { [lockFile]: lockFileContent.slice(0, versionNode.range[0]) + replacement + lockFileContent.slice(versionNode.range[1]) };
		if (!isNullOrUndefined(config.packageFileContent)) files[config.packageFile] = config.packageFileContent;
		return {
			status: "updated",
			files
		};
	} catch (err) {
		logger.debug({ err }, "mise.updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map