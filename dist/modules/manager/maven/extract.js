import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { MAVEN_REPO } from "../../datasource/maven/common.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { getDep } from "../dockerfile/extract.js";
import { BUILDPACK_REGISTRY_PREFIX, DOCKER_PREFIX, getDep as getDep$1, isBuildpackRegistryRef, isDockerRef } from "../buildpacks/extract.js";
import { isArray, isNonEmptyArray } from "@sindresorhus/is";
import upath from "upath";
import { XmlDocument } from "xmldoc";
//#region lib/modules/manager/maven/extract.ts
const supportedNamespaces = [
	"http://maven.apache.org/SETTINGS/1.0.0",
	"http://maven.apache.org/SETTINGS/1.1.0",
	"http://maven.apache.org/SETTINGS/1.2.0"
];
const supportedExtensionsNamespaces = [
	"http://maven.apache.org/EXTENSIONS/1.0.0",
	"http://maven.apache.org/EXTENSIONS/1.1.0",
	"http://maven.apache.org/EXTENSIONS/1.2.0"
];
function parsePom(raw, packageFile) {
	let project;
	try {
		project = new XmlDocument(raw);
		if (raw.includes("\r\n")) logger.warn("Your pom.xml contains windows line endings. This is not supported and may result in parsing issues.");
	} catch {
		logger.debug({ packageFile }, `Failed to parse as XML`);
		return null;
	}
	const { name, attr, children } = project;
	if (name !== "project") return null;
	if (attr.xmlns === "http://maven.apache.org/POM/4.0.0") return project;
	if (isNonEmptyArray(children) && children.some((c) => c.name === "modelVersion" && c.val === "4.0.0")) return project;
	return null;
}
function parseExtensions(raw, packageFile) {
	let extensions;
	try {
		extensions = new XmlDocument(raw);
	} catch {
		logger.debug({ packageFile }, `Failed to parse as XML`);
		return null;
	}
	const { name, attr, children } = extensions;
	if (name !== "extensions") return null;
	if (!supportedExtensionsNamespaces.includes(attr.xmlns)) return null;
	if (!isNonEmptyArray(children)) return null;
	return extensions;
}
function containsPlaceholder(str) {
	return !!str && (regEx(/\${[^}]*?}/).test(str) || regEx(/\{\{[^}]*?\}\}/).test(str));
}
function getCNBDependencies(nodes, config) {
	const deps = [];
	for (const node of nodes) {
		const depString = node.val.trim();
		if (isDockerRef(depString)) {
			const dep = getDep(depString.replace(DOCKER_PREFIX, ""), true, config.registryAliases);
			dep.fileReplacePosition = node.position;
			// v8 ignore else -- the extractor always populates this field
			if (dep.currentValue || dep.currentDigest) deps.push(dep);
		} else if (isBuildpackRegistryRef(depString)) {
			const dep = getDep$1(depString.replace(BUILDPACK_REGISTRY_PREFIX, ""));
			if (dep?.currentValue) {
				dep.fileReplacePosition = node.position;
				deps.push(dep);
			}
		}
	}
	return deps;
}
function getAllCNBDependencies(node, config) {
	const pluginNode = coerceArray(node.childNamed("build")?.childNamed("plugins")?.childrenNamed("plugin")).find((pluginNode) => {
		return pluginNode.valueWithPath("groupId")?.trim() === "org.springframework.boot" && pluginNode.valueWithPath("artifactId")?.trim() === "spring-boot-maven-plugin";
	});
	if (!pluginNode) return null;
	const deps = [];
	const imageNode = pluginNode.childNamed("configuration")?.childNamed("image");
	if (!imageNode) return null;
	const builder = getCNBDependencies(imageNode.childrenNamed("builder"), config);
	const runImage = getCNBDependencies(imageNode.childrenNamed("runImage"), config);
	const buildpacks = getCNBDependencies(coerceArray(imageNode.childNamed("buildpacks")?.childrenNamed("buildpack")), config);
	deps.push(...builder, ...runImage, ...buildpacks);
	return deps.length ? deps : null;
}
function depFromNode(node, underBuildSettingsElement) {
	if (!("valueWithPath" in node)) return null;
	let groupId = node.valueWithPath("groupId")?.trim();
	const artifactId = node.valueWithPath("artifactId")?.trim();
	const currentValue = node.valueWithPath("version")?.trim();
	let depType;
	if (!groupId && node.name === "plugin") groupId = "org.apache.maven.plugins";
	if (groupId && artifactId && currentValue) {
		const depName = `${groupId}:${artifactId}`;
		const fileReplacePosition = node.descendantWithPath("version").position;
		const result = {
			datasource: MavenDatasource.id,
			depName,
			currentValue,
			fileReplacePosition,
			registryUrls: []
		};
		switch (node.name) {
			case "plugin":
			case "extension":
				depType = "build";
				break;
			case "parent":
				depType = "parent";
				break;
			case "dependency": if (underBuildSettingsElement) depType = "build";
			else if (node.valueWithPath("optional")?.trim() === "true") depType = "optional";
			else depType = node.valueWithPath("scope")?.trim() ?? "compile";
		}
		if (depType) result.depType = depType;
		return result;
	}
	return null;
}
function deepExtract(node, result = [], isRoot = true, underBuildSettingsElement = false) {
	const dep = depFromNode(node, underBuildSettingsElement);
	if (dep && !isRoot) result.push(dep);
	if (node.children) for (const child of node.children) deepExtract(child, result, false, node.name === "build" || node.name === "reporting" || underBuildSettingsElement);
	return result;
}
function applyProps(dep, depPackageFile, props) {
	let result = dep;
	let anyChange = false;
	const alreadySeenProps = /* @__PURE__ */ new Set();
	do {
		const [returnedResult, returnedAnyChange, fatal] = applyPropsInternal(result, depPackageFile, props, alreadySeenProps);
		if (fatal) {
			dep.skipReason = "recursive-placeholder";
			return dep;
		}
		result = returnedResult;
		anyChange = returnedAnyChange;
	} while (anyChange);
	if (containsPlaceholder(result.depName)) result.skipReason = "name-placeholder";
	else if (containsPlaceholder(result.currentValue)) result.skipReason = "version-placeholder";
	return result;
}
function applyPropsInternal(dep, depPackageFile, props, previouslySeenProps) {
	let anyChange = false;
	let fatal = false;
	const seenProps = /* @__PURE__ */ new Set();
	function replaceAll(str) {
		return str.replace(regEx(/\${[^}]*?}/g), (substr) => {
			const propKey = substr.slice(2, -1).trim();
			const propValue = props[propKey];
			if (propValue) {
				anyChange = true;
				if (previouslySeenProps.has(propKey)) fatal = true;
				else seenProps.add(propKey);
				return propValue.val;
			}
			return substr;
		});
	}
	let depName = dep.depName;
	// v8 ignore else -- the extractor always populates this field
	if (dep.depName) depName = replaceAll(dep.depName);
	const registryUrls = dep.registryUrls.map((url) => replaceAll(url));
	let fileReplacePosition = dep.fileReplacePosition;
	let propSource = dep.propSource;
	let sharedVariableName = null;
	let currentValue = null;
	// v8 ignore else -- the extractor always populates this field
	if (dep.currentValue) currentValue = dep.currentValue.replace(regEx(/^\${[^}]*?}$/), (substr) => {
		const propKey = substr.slice(2, -1).trim();
		const propValue = props[propKey];
		if (propValue) {
			sharedVariableName ??= propKey;
			fileReplacePosition = propValue.fileReplacePosition;
			propSource = propValue.packageFile;
			anyChange = true;
			if (previouslySeenProps.has(propKey)) fatal = true;
			else seenProps.add(propKey);
			return propValue.val;
		}
		return substr;
	});
	const result = {
		...dep,
		depName,
		registryUrls,
		fileReplacePosition,
		propSource,
		currentValue
	};
	if (sharedVariableName) result.sharedVariableName = sharedVariableName;
	if (propSource && depPackageFile !== propSource) result.editFile = propSource;
	for (const prop of seenProps) previouslySeenProps.add(prop);
	return [
		result,
		anyChange,
		fatal
	];
}
function resolveParentFile(packageFile, parentPath) {
	let parentFile = "pom.xml";
	let parentDir = parentPath;
	const parentBasename = upath.basename(parentPath);
	if (parentBasename === "pom.xml" || parentBasename.endsWith(".pom.xml")) {
		parentFile = parentBasename;
		parentDir = upath.dirname(parentPath);
	}
	const dir = upath.dirname(packageFile);
	return upath.normalize(upath.join(dir, parentDir, parentFile));
}
function extractPackage(rawContent, packageFile, config) {
	if (!rawContent) return null;
	const project = parsePom(rawContent, packageFile);
	if (!project) return null;
	const result = {
		datasource: MavenDatasource.id,
		packageFile,
		deps: []
	};
	result.deps = deepExtract(project);
	const CNBDependencies = getAllCNBDependencies(project, config);
	if (CNBDependencies) result.deps.push(...CNBDependencies);
	const propsNode = project.childNamed("properties");
	const props = {};
	if (propsNode?.children) for (const propNode of propsNode.children) {
		const key = propNode.name;
		const val = propNode?.val?.trim();
		if (key && val && propNode.position) props[key] = {
			val,
			fileReplacePosition: propNode.position,
			packageFile
		};
	}
	result.mavenProps = props;
	const repositories = project.childNamed("repositories");
	if (repositories?.children) {
		const repoUrls = [];
		for (const repo of repositories.childrenNamed("repository")) {
			const repoUrl = repo.valueWithPath("url")?.trim();
			if (repoUrl) repoUrls.push(repoUrl);
		}
		result.deps.forEach((dep) => {
			// v8 ignore else -- the extractor always populates this field
			if (isArray(dep.registryUrls)) repoUrls.forEach((url) => dep.registryUrls.push(url));
		});
	}
	if (packageFile && project.childNamed("parent")) result.parent = resolveParentFile(packageFile, project.valueWithPath("parent.relativePath")?.trim() ?? "../pom.xml");
	if (project.childNamed("version")) result.packageFileVersion = project.valueWithPath("version").trim();
	return result;
}
function extractRegistries(rawContent) {
	if (!rawContent) return [];
	const settings = parseSettings(rawContent);
	if (!settings) return [];
	const urls = [];
	const mirrorUrls = parseUrls(settings, "mirrors");
	urls.push(...mirrorUrls);
	settings.childNamed("profiles")?.eachChild((profile) => {
		const repositoryUrls = parseUrls(profile, "repositories");
		urls.push(...repositoryUrls);
	});
	return [...new Set(urls)];
}
function parseUrls(xmlNode, path) {
	const children = xmlNode.descendantWithPath(path);
	const urls = [];
	if (children?.children) children.eachChild((child) => {
		const url = child.valueWithPath("url");
		// v8 ignore else -- the extractor always populates this field
		if (url) urls.push(url);
	});
	return urls;
}
function parseSettings(raw) {
	let settings;
	try {
		settings = new XmlDocument(raw);
	} catch {
		return null;
	}
	const { name, attr } = settings;
	if (name !== "settings") return null;
	if (supportedNamespaces.includes(attr.xmlns)) return settings;
	return null;
}
function resolveParents(packages) {
	const packageFileNames = [];
	const extractedPackages = {};
	const extractedDeps = {};
	const extractedProps = {};
	const registryUrls = {};
	packages.forEach((pkg) => {
		const name = pkg.packageFile;
		packageFileNames.push(name);
		extractedPackages[name] = pkg;
		extractedDeps[name] = [];
	});
	packageFileNames.forEach((name) => {
		registryUrls[name] = /* @__PURE__ */ new Set();
		const propsHierarchy = [];
		const visitedPackages = /* @__PURE__ */ new Set();
		let pkg = extractedPackages[name];
		while (pkg) {
			propsHierarchy.unshift(pkg.mavenProps);
			// v8 ignore else -- the extractor always populates this field
			if (pkg.deps) pkg.deps.forEach((dep) => {
				// v8 ignore else -- the extractor always populates this field
				if (dep.registryUrls) dep.registryUrls.forEach((url) => {
					registryUrls[name].add(url);
				});
			});
			if (pkg.parent && !visitedPackages.has(pkg.parent)) {
				visitedPackages.add(pkg.parent);
				pkg = extractedPackages[pkg.parent];
			} else pkg = null;
		}
		propsHierarchy.unshift({});
		extractedProps[name] = Object.assign.apply(null, propsHierarchy);
	});
	packageFileNames.forEach((name) => {
		extractedPackages[name].deps.forEach((rawDep) => {
			rawDep.registryUrls = [.../* @__PURE__ */ new Set([...coerceArray(rawDep.registryUrls), ...registryUrls[name]])];
		});
	});
	const rootDeps = /* @__PURE__ */ new Set();
	packageFileNames.forEach((name) => {
		const pkg = extractedPackages[name];
		pkg.deps.forEach((rawDep) => {
			const dep = applyProps(rawDep, name, extractedProps[name]);
			if (dep.depType === "parent") {
				const parentPkg = extractedPackages[pkg.parent];
				const hasParentWithNoParent = parentPkg && !parentPkg.parent;
				const hasParentWithExternalParent = parentPkg && !packageFileNames.includes(parentPkg.parent);
				if (hasParentWithNoParent || hasParentWithExternalParent) rootDeps.add(dep.depName);
			}
			const sourceName = dep.propSource ?? name;
			extractedDeps[sourceName].push(dep);
		});
	});
	return packageFileNames.map((packageFile) => {
		const pkg = extractedPackages[packageFile];
		const deps = extractedDeps[packageFile];
		for (const dep of deps) if (rootDeps.has(dep.depName)) dep.depType = "parent-root";
		return {
			...pkg,
			deps
		};
	});
}
function cleanResult(packageFiles) {
	packageFiles.forEach((packageFile) => {
		delete packageFile.mavenProps;
		delete packageFile.parent;
		packageFile.deps.forEach((dep) => {
			delete dep.propSource;
			// v8 ignore else -- the extractor always populates this field
			if (dep.datasource === MavenDatasource.id) dep.registryUrls.push(MAVEN_REPO);
		});
	});
	return packageFiles;
}
function extractExtensions(rawContent, packageFile) {
	if (!rawContent) return null;
	const extensions = parseExtensions(rawContent, packageFile);
	if (!extensions) return null;
	const result = {
		datasource: MavenDatasource.id,
		packageFile,
		deps: []
	};
	result.deps = deepExtract(extensions);
	return result;
}
async function extractAllPackageFiles(config, packageFiles) {
	const packages = [];
	const additionalRegistryUrls = [];
	for (const packageFile of packageFiles) {
		const content = await readLocalFile(packageFile, "utf8");
		if (!content) {
			logger.debug({ packageFile }, "packageFile has no content");
			continue;
		}
		if (packageFile.endsWith("settings.xml")) {
			const registries = extractRegistries(content);
			// v8 ignore else -- needs a settings.xml carrying no registries
			if (registries) {
				logger.debug({
					registries,
					packageFile
				}, "Found registryUrls in settings.xml");
				additionalRegistryUrls.push(...registries);
			}
		} else if (packageFile.endsWith(".mvn/extensions.xml")) {
			const extensions = extractExtensions(content, packageFile);
			if (extensions) packages.push(extensions);
			else logger.trace({ packageFile }, "can not read extensions");
		} else {
			const pkg = extractPackage(content, packageFile, config);
			if (pkg) packages.push(pkg);
			else logger.trace({ packageFile }, "can not read dependencies");
		}
	}
	// v8 ignore else -- the array is always defined, so this is never falsy
	if (additionalRegistryUrls) {
		for (const pkgFile of packages) for (const dep of pkgFile.deps)
 // v8 ignore else -- the extractor always populates this field
		if (dep.registryUrls) dep.registryUrls.unshift(...additionalRegistryUrls);
	}
	return cleanResult(resolveParents(packages));
}
//#endregion
export { extractAllPackageFiles, extractExtensions, extractPackage, extractRegistries, parseSettings, resolveParents };

//# sourceMappingURL=extract.js.map