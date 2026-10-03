import { coerceObject, hasKey } from "../../../../util/object.js";
import { regEx } from "../../../../util/regex.js";
import { massage, parse } from "../../../../util/toml.js";
import { isTOMLFile } from "../utils.js";
import { isPlainObject, isString } from "@sindresorhus/is";
import merge from "deepmerge";
//#region lib/modules/manager/gradle/extract/catalog.ts
function findVersionIndex(content, depName, version) {
	const eDn = RegExp.escape(depName);
	const eVer = RegExp.escape(version);
	const match = regEx(`(?:id\\s*=\\s*)?['"]?${eDn}["']?(?:(?:\\s*=\\s*)|:|,\\s*)(?:.*version(?:\\.ref)?(?:\\s*\\=\\s*))?["']?${eVer}['"]?`).exec(content);
	// v8 ignore else -- the fallback below is already marked unreachable
	if (match) return match.index + content.slice(match.index).indexOf(version);
	/* istanbul ignore next */
	return findIndexAfter(content, depName, version);
}
function findIndexAfter(content, sliceAfter, find) {
	const slicePoint = content.indexOf(sliceAfter) + sliceAfter.length;
	return slicePoint + content.slice(slicePoint).indexOf(find);
}
function isArtifactDescriptor(obj) {
	return hasKey("group", obj);
}
function isVersionPointer(obj) {
	return hasKey("ref", obj);
}
function normalizeAlias(alias) {
	return alias.replace(regEx(/[-_]/g), ".");
}
function findOriginalAlias(versions, alias) {
	const normalizedAlias = normalizeAlias(alias);
	for (const sectionKey of Object.keys(versions)) if (normalizeAlias(sectionKey) === normalizedAlias) return sectionKey;
	return alias;
}
function extractVersion({ version, versions, depStartIndex, depSubContent, depName, versionStartIndex, versionSubContent }) {
	if (isVersionPointer(version)) {
		const originalAlias = findOriginalAlias(versions, version.ref);
		return extractLiteralVersion({
			version: versions[originalAlias],
			depStartIndex: versionStartIndex,
			depSubContent: versionSubContent,
			sectionKey: originalAlias
		});
	}
	return extractLiteralVersion({
		version,
		depStartIndex,
		depSubContent,
		sectionKey: depName
	});
}
function extractLiteralVersion({ version, depStartIndex, depSubContent, sectionKey }) {
	if (!version) return { skipReason: "unspecified-version" };
	if (isString(version)) return {
		currentValue: version,
		fileReplacePosition: depStartIndex + findVersionIndex(depSubContent, sectionKey, version)
	};
	// v8 ignore else -- a version is either a string, handled above, or a table
	if (isPlainObject(version)) {
		const versionKeys = [
			"require",
			"prefer",
			"strictly"
		];
		let found = false;
		let currentValue;
		let fileReplacePosition;
		if (version.reject || version.rejectAll) return { skipReason: "unsupported-version" };
		for (const key of versionKeys) if (key in version) {
			if (found) return { skipReason: "multiple-constraint-dep" };
			found = true;
			currentValue = version[key];
			fileReplacePosition = depStartIndex + findIndexAfter(depSubContent, sectionKey, currentValue);
		}
		if (found) return {
			currentValue,
			fileReplacePosition
		};
	}
	return { skipReason: "unspecified-version" };
}
function extractDependency({ descriptor, versions, depStartIndex, depSubContent, depName, versionStartIndex, versionSubContent }) {
	if (isString(descriptor)) {
		const [group, name, currentValue] = descriptor.split(":");
		if (!currentValue) return {
			depName,
			skipReason: "unspecified-version"
		};
		return {
			depName: `${group}:${name}`,
			currentValue,
			managerData: { fileReplacePosition: depStartIndex + findIndexAfter(depSubContent, depName, currentValue) }
		};
	}
	const { currentValue, fileReplacePosition, skipReason } = extractVersion({
		version: descriptor.version,
		versions,
		depStartIndex,
		depSubContent,
		depName,
		versionStartIndex,
		versionSubContent
	});
	if (skipReason) return {
		depName,
		skipReason
	};
	const dependency = {
		currentValue,
		managerData: { fileReplacePosition }
	};
	if (isArtifactDescriptor(descriptor)) {
		const { group, name } = descriptor;
		dependency.depName = `${group}:${name}`;
	} else {
		const [depGroupName, name] = descriptor.module.split(":");
		dependency.depName = `${depGroupName}:${name}`;
	}
	if (isVersionPointer(descriptor.version)) dependency.sharedVariableName = normalizeAlias(descriptor.version.ref);
	return dependency;
}
function parseCatalog(packageFile, content) {
	const tomlContent = parse(massage(content));
	const versions = coerceObject(tomlContent.versions);
	const libs = coerceObject(tomlContent.libraries);
	const libStartIndex = content.indexOf("libraries");
	const libSubContent = content.slice(libStartIndex);
	const versionStartIndex = content.indexOf("versions");
	const versionSubContent = content.slice(versionStartIndex);
	const extractedDeps = [];
	const vars = {};
	for (const [key, version] of Object.entries(versions)) {
		const { currentValue, fileReplacePosition } = extractLiteralVersion({
			version,
			depStartIndex: versionStartIndex,
			depSubContent: versionSubContent,
			sectionKey: key
		});
		if (currentValue && fileReplacePosition !== void 0) vars[normalizeAlias(key)] = {
			key: normalizeAlias(key),
			value: currentValue,
			fileReplacePosition,
			packageFile
		};
	}
	for (const libraryName of Object.keys(libs)) {
		const libDescriptor = libs[libraryName];
		const dependency = extractDependency({
			descriptor: libDescriptor,
			versions,
			depStartIndex: libStartIndex,
			depSubContent: libSubContent,
			depName: libraryName,
			versionStartIndex,
			versionSubContent
		});
		extractedDeps.push(dependency);
	}
	const plugins = coerceObject(tomlContent.plugins);
	const pluginsStartIndex = content.indexOf("[plugins]");
	const pluginsSubContent = content.slice(pluginsStartIndex);
	for (const pluginName of Object.keys(plugins)) {
		const pluginDescriptor = plugins[pluginName];
		const [depName, version] = isString(pluginDescriptor) ? pluginDescriptor.split(":") : [pluginDescriptor.id, pluginDescriptor.version];
		const { currentValue, fileReplacePosition, skipReason } = extractVersion({
			version,
			versions,
			depStartIndex: pluginsStartIndex,
			depSubContent: pluginsSubContent,
			depName,
			versionStartIndex,
			versionSubContent
		});
		const dependency = {
			depType: "plugin",
			depName,
			packageName: `${depName}:${depName}.gradle.plugin`,
			currentValue,
			commitMessageTopic: `plugin ${pluginName}`,
			managerData: { fileReplacePosition }
		};
		if (skipReason) dependency.skipReason = skipReason;
		if (isVersionPointer(version) && dependency.commitMessageTopic) {
			dependency.sharedVariableName = normalizeAlias(version.ref);
			delete dependency.commitMessageTopic;
		}
		extractedDeps.push(dependency);
	}
	return {
		vars,
		deps: extractedDeps.map((dep) => {
			return merge(dep, { managerData: { packageFile } });
		})
	};
}
function makeCatalogGroupKey(dep) {
	return `${dep.managerData.packageFile}:${dep.managerData.fileReplacePosition}`;
}
function unifyCatalogSharedVariableNames(deps) {
	const aliasMap = {};
	const catalogDeps = [];
	for (const dep of deps) {
		const packageFile = dep.managerData?.packageFile;
		if (packageFile && dep.managerData?.fileReplacePosition !== void 0 && dep.sharedVariableName && isTOMLFile(packageFile)) {
			catalogDeps.push(dep);
			const key = makeCatalogGroupKey(dep);
			(aliasMap[key] ??= []).push(dep.sharedVariableName);
		}
	}
	for (const dep of catalogDeps) {
		const aliases = aliasMap[makeCatalogGroupKey(dep)];
		if (aliases.length > 1) dep.sharedVariableName = aliases[0].replace(regEx(/^[^.]+\.versions\./), "");
	}
}
//#endregion
export { parseCatalog, unifyCatalogSharedVariableNames };

//# sourceMappingURL=catalog.js.map