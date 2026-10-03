import { coerceObject } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { api } from "../../versioning/gradle/index.js";
import upath from "upath";
//#region lib/modules/manager/gradle/utils.ts
const artifactRegex = regEx("^[a-zA-Z][-_a-zA-Z0-9]*(?:\\.[a-zA-Z0-9][-_a-zA-Z0-9]*?)*$");
const versionLikeRegex = regEx("^(?<version>[-_.\\[\\](),a-zA-Z0-9+! ]+)");
function versionLikeSubstring(input) {
	if (!input) return null;
	const version = versionLikeRegex.exec(input)?.groups?.version?.trim();
	if (!version || !regEx(/\d/).test(version)) return null;
	if (!api.isValid(version)) return null;
	return version;
}
function isDependencyString(input) {
	const [depNotation, ...extra] = input.split("@");
	if (extra.length > 1) return false;
	const parts = depNotation.split(":");
	if (parts.length !== 3 && parts.length !== 4) return false;
	const [groupId, artifactId, version, classifier] = parts;
	return !!(groupId && artifactId && version && artifactRegex.test(groupId) && artifactRegex.test(artifactId) && (!classifier || artifactRegex.test(classifier)) && version === versionLikeSubstring(version));
}
function parseDependencyString(input) {
	if (!isDependencyString(input)) return null;
	const [depNotation, dataType] = input.split("@");
	const [groupId, artifactId, currentValue] = depNotation.split(":");
	return {
		depName: `${groupId}:${artifactId}`,
		currentValue,
		...dataType && { dataType }
	};
}
const gradleVersionsFileRegex = regEx("^versions\\.gradle(?:\\.kts)?$", "i");
const gradleBuildFileRegex = regEx("^build\\.gradle(?:\\.kts)?$", "i");
const gradleSettingsFileRegex = regEx("^settings\\.gradle(?:\\.kts)?$", "i");
function isGradleScriptFile(path) {
	const filename = upath.basename(path).toLowerCase();
	return filename.endsWith(".gradle.kts") || filename.endsWith(".gradle");
}
function isGradleVersionsFile(path) {
	const filename = upath.basename(path);
	return gradleVersionsFileRegex.test(filename);
}
function isGradleBuildFile(path) {
	const filename = upath.basename(path);
	return gradleBuildFileRegex.test(filename);
}
function isGradleSettingsFile(path) {
	const filename = upath.basename(path);
	return gradleSettingsFileRegex.test(filename);
}
function isGradleDefaultCatalogFile(path) {
	return path.endsWith("/gradle/libs.versions.toml");
}
function isPropsFile(path) {
	return upath.basename(path).toLowerCase() === "gradle.properties";
}
function isKotlinSourceFile(path) {
	return upath.basename(path).toLowerCase().endsWith(".kt");
}
function isTOMLFile(path) {
	return upath.basename(path).toLowerCase().endsWith(".toml");
}
function toAbsolutePath(packageFile) {
	return upath.join(packageFile.replace(regEx(/^[/\\]*/), "/"));
}
function getFileRank(filename) {
	if (isPropsFile(filename)) return 0;
	if (isGradleSettingsFile(filename)) return 1;
	if (isGradleDefaultCatalogFile(filename)) return 2;
	if (isGradleVersionsFile(filename)) return 3;
	if (isGradleBuildFile(filename)) return 5;
	return 4;
}
function reorderFiles(packageFiles) {
	return packageFiles.map((path) => {
		const absPath = toAbsolutePath(path);
		const currentDir = upath.dirname(absPath);
		return {
			path,
			absPath,
			dir: isGradleDefaultCatalogFile(absPath) ? upath.dirname(currentDir) : currentDir,
			rank: getFileRank(absPath)
		};
	}).sort((a, b) => {
		if (a.dir !== b.dir) {
			if (a.dir.startsWith(`${b.dir}/`)) return 1;
			if (b.dir.startsWith(`${a.dir}/`)) return -1;
			return a.dir.localeCompare(b.dir);
		}
		return a.rank - b.rank || a.absPath.localeCompare(b.absPath);
	}).map((entry) => entry.path);
}
function getVars(registry, dir, vars = registry[dir] || {}) {
	const dirAbs = toAbsolutePath(dir);
	const parentDir = upath.dirname(dirAbs);
	if (parentDir === dirAbs) return vars;
	return getVars(registry, parentDir, {
		...registry[parentDir] || {},
		...vars
	});
}
function updateVars(registry, dir, newVars) {
	registry[dir] = {
		...coerceObject(registry[dir]),
		...newVars
	};
}
function updateVarsFromDefaultCatalog(registry, dir, packageFile, newVars) {
	if (!isGradleDefaultCatalogFile(toAbsolutePath(packageFile))) return;
	const rootDir = upath.dirname(dir);
	const oldVars = coerceObject(registry[rootDir]);
	let defaultLibsExtName = "libs";
	if (oldVars.defaultLibrariesExtensionName?.packageFile && isGradleSettingsFile(oldVars.defaultLibrariesExtensionName.packageFile)) defaultLibsExtName = oldVars.defaultLibrariesExtensionName.value;
	const newVarsRemapped = {};
	for (const [oldKey, variableData] of Object.entries(newVars)) {
		const key = `${defaultLibsExtName}.versions.${oldKey}`;
		newVarsRemapped[key] = {
			...variableData,
			key
		};
	}
	registry[rootDir] = {
		...oldVars,
		...newVarsRemapped
	};
}
//#endregion
export { getVars, isDependencyString, isGradleBuildFile, isGradleDefaultCatalogFile, isGradleScriptFile, isGradleSettingsFile, isGradleVersionsFile, isKotlinSourceFile, isPropsFile, isTOMLFile, parseDependencyString, reorderFiles, toAbsolutePath, updateVars, updateVarsFromDefaultCatalog, versionLikeSubstring };

//# sourceMappingURL=utils.js.map