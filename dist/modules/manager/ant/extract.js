import { logger } from "../../../logger/index.js";
import { isValidLocalPath, readLocalFile } from "../../../util/fs/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { extractRegistries } from "../maven/extract.js";
import { isXmlElement } from "../nuget/util.js";
import { applyProps, containsPlaceholder, findAttrValuePosition, parsePropertiesFile, resolveChainedProps } from "./properties.js";
import upath from "upath";
import { XmlDocument } from "xmldoc";
//#region lib/modules/manager/ant/extract.ts
const scopeNames = /* @__PURE__ */ new Set([
	"compile",
	"runtime",
	"test",
	"provided",
	"system"
]);
function getDependencyType(scope) {
	if (scope && scopeNames.has(scope)) return scope;
	return "compile";
}
function parseCoords(coordsStr) {
	const parts = coordsStr.split(":");
	if (parts.length < 3) {
		logger.trace({ coordsStr }, "ant manager: coords has fewer than 3 parts");
		return null;
	}
	const [groupId, artifactId] = parts;
	if (!groupId || !artifactId) {
		logger.trace({ coordsStr }, "ant manager: coords has empty groupId or artifactId");
		return null;
	}
	let scope;
	let rawVersion;
	if (parts.length >= 4 && scopeNames.has(parts.at(-1))) {
		scope = parts.at(-1);
		rawVersion = parts.at(-2);
	} else rawVersion = parts.at(-1);
	return {
		groupId,
		artifactId,
		rawVersion,
		scope
	};
}
async function readSettingsRegistries(settingsFile, baseDir) {
	const settingsPath = settingsFile.startsWith("/") ? settingsFile : upath.join(baseDir, settingsFile);
	if (!isValidLocalPath(settingsPath)) {
		logger.debug(`ant manager: skipping settings file outside repository: ${settingsPath}`);
		return [];
	}
	const settingsContent = await readLocalFile(settingsPath, "utf8");
	if (!settingsContent) {
		logger.debug(`ant manager: could not read settings file ${settingsPath}`);
		return [];
	}
	return extractRegistries(settingsContent);
}
async function collectRegistryUrls(node, baseDir) {
	const urls = [];
	const settingsFile = node.attr.settingsFile;
	if (settingsFile) urls.push(...await readSettingsRegistries(settingsFile, baseDir));
	for (const child of node.children) if (isXmlElement(child) && child.name === "remoteRepository" && child.attr.url) urls.push(child.attr.url);
	return [...new Set(urls)];
}
function collectCoordsDependency(node, packageFile, content, registryUrls) {
	const coordsStr = node.attr.coords;
	const parsed = parseCoords(coordsStr);
	if (!parsed) return null;
	const dep = {
		datasource: MavenDatasource.id,
		depName: `${parsed.groupId}:${parsed.artifactId}`,
		currentValue: parsed.rawVersion,
		depType: getDependencyType(parsed.scope ?? node.attr.scope),
		...registryUrls?.length && { registryUrls }
	};
	dep.fileReplacePosition = findAttrValuePosition(content, node, "coords") + coordsStr.lastIndexOf(parsed.rawVersion);
	return {
		dep,
		depPackageFile: packageFile
	};
}
function collectDependency(node, packageFile, content, registryUrls = []) {
	if (node.attr.coords) return collectCoordsDependency(node, packageFile, content, registryUrls);
	const { groupId, artifactId, version, scope } = node.attr;
	if (!version || !groupId || !artifactId) return null;
	const dep = {
		datasource: MavenDatasource.id,
		depName: `${groupId}:${artifactId}`,
		currentValue: version,
		depType: getDependencyType(scope),
		...registryUrls?.length && { registryUrls }
	};
	dep.fileReplacePosition = findAttrValuePosition(content, node, "version");
	return {
		dep,
		depPackageFile: packageFile
	};
}
function walkNode(node, rawDeps, packageFile, content) {
	for (const child of node.children) {
		if (!isXmlElement(child)) continue;
		if (child.name === "dependency") {
			const rawDep = collectDependency(child, packageFile, content);
			if (rawDep) rawDeps.push(rawDep);
		} else walkNode(child, rawDeps, packageFile, content);
	}
}
function extractPackageFile(content, packageFile) {
	let doc;
	try {
		doc = new XmlDocument(content);
	} catch {
		logger.debug(`ant manager: could not parse XML ${packageFile}`);
		return null;
	}
	const rawDeps = [];
	walkNode(doc, rawDeps, packageFile, content);
	const deps = rawDeps.map((rd) => rd.dep);
	if (deps.length === 0) return null;
	return { deps };
}
async function loadPropertyFile(file, baseDir, visitedFiles, allProps) {
	if (containsPlaceholder(file)) {
		logger.debug(`ant manager: skipping properties file with unresolved placeholders in path: ${file}`);
		return;
	}
	const propFilePath = file.startsWith("/") ? file : upath.join(baseDir, file);
	if (!isValidLocalPath(propFilePath)) {
		logger.debug(`ant manager: skipping properties file outside repository: ${propFilePath}`);
		return;
	}
	if (visitedFiles.has(propFilePath)) return;
	visitedFiles.add(propFilePath);
	const propContent = await readLocalFile(propFilePath, "utf8");
	if (!propContent) {
		logger.debug(`ant manager: could not read properties file ${propFilePath}`);
		return;
	}
	parsePropertiesFile(propContent, propFilePath, allProps);
}
async function loadImportedFile(file, baseDir, visitedFiles, allProps, allRawDeps) {
	if (containsPlaceholder(file)) {
		logger.debug(`ant manager: skipping import file with unresolved placeholders in path: ${file}`);
		return;
	}
	const importedFile = upath.normalize(upath.join(baseDir, file));
	if (!isValidLocalPath(importedFile)) {
		logger.debug(`ant manager: skipping import file outside repository: ${importedFile}`);
		return;
	}
	await walkXmlFile(importedFile, visitedFiles, allProps, allRawDeps);
}
/**
* Walk an XML node tree in document order, processing properties,
* property file references, and dependencies as they appear.
*/
async function walkNodeInOrder(node, packageFile, content, visitedFiles, allProps, allRawDeps, registryUrls = []) {
	const baseDir = upath.dirname(packageFile);
	for (const child of node.children) {
		if (!isXmlElement(child)) continue;
		if (child.name === "property") {
			const name = child.attr.name;
			const value = child.attr.value;
			if (name && value && !(name in allProps)) allProps[name] = {
				val: value,
				fileReplacePosition: findAttrValuePosition(content, child, "value"),
				packageFile
			};
			if (child.attr.file) await loadPropertyFile(child.attr.file, baseDir, visitedFiles, allProps);
		} else if (child.name === "import" && child.attr.file) await loadImportedFile(child.attr.file, baseDir, visitedFiles, allProps, allRawDeps);
		else if (child.name === "dependency") {
			const rawDep = collectDependency(child, packageFile, content, registryUrls);
			if (rawDep) allRawDeps.push(rawDep);
		} else {
			const childRegistries = await collectRegistryUrls(child, baseDir);
			await walkNodeInOrder(child, packageFile, content, visitedFiles, allProps, allRawDeps, childRegistries.length > 0 ? childRegistries : registryUrls);
		}
	}
}
async function walkXmlFile(packageFile, visitedFiles, allProps, allRawDeps) {
	if (visitedFiles.has(packageFile)) return;
	visitedFiles.add(packageFile);
	const content = await readLocalFile(packageFile, "utf8");
	if (!content) {
		logger.debug(`ant manager: could not read ${packageFile}`);
		return;
	}
	let doc;
	try {
		doc = new XmlDocument(content);
	} catch {
		logger.debug(`ant manager: could not parse XML ${packageFile}`);
		return;
	}
	await walkNodeInOrder(doc, packageFile, content, visitedFiles, allProps, allRawDeps);
}
async function extractAllPackageFiles(_config, packageFiles) {
	const results = [];
	const seen = /* @__PURE__ */ new Set();
	for (const packageFile of packageFiles) {
		if (seen.has(packageFile)) continue;
		seen.add(packageFile);
		const visitedFiles = /* @__PURE__ */ new Set();
		const allProps = {};
		const allRawDeps = [];
		await walkXmlFile(packageFile, visitedFiles, allProps, allRawDeps);
		resolveChainedProps(allProps);
		const resolvedDeps = allRawDeps.map((rawDep) => applyProps(rawDep.dep, rawDep.depPackageFile, allProps));
		if (resolvedDeps.length === 0) continue;
		const fileMap = /* @__PURE__ */ new Map();
		for (let i = 0; i < resolvedDeps.length; i++) {
			const dep = resolvedDeps[i];
			const targetFile = dep.propSource ?? allRawDeps[i].depPackageFile;
			if (!fileMap.has(targetFile)) fileMap.set(targetFile, []);
			fileMap.get(targetFile).push(dep);
		}
		for (const [pkgFile, deps] of fileMap) {
			for (const dep of deps) delete dep.propSource;
			results.push({
				packageFile: pkgFile,
				deps
			});
		}
	}
	return results.length > 0 ? results : null;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map