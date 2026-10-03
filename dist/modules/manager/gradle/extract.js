import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { getLocalFiles } from "../../../util/fs/index.js";
import { api } from "../../versioning/gradle/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { REGISTRY_URLS } from "./parser/common.js";
import { getVars, isGradleScriptFile, isKotlinSourceFile, isPropsFile, isTOMLFile, reorderFiles, toAbsolutePath, updateVars, updateVarsFromDefaultCatalog } from "./utils.js";
import { parseGradle, parseKotlinSource, parseProps } from "./parser.js";
import { isGcvPropsFile, parseGcv, usesGcv } from "./extract/consistent-versions-plugin.js";
import { parseCatalog, unifyCatalogSharedVariableNames } from "./extract/catalog.js";
import upath from "upath";
//#region lib/modules/manager/gradle/extract.ts
const mavenDatasource = MavenDatasource.id;
function updatePackageRegistries(packageRegistries, urls) {
	for (const url of urls)
 // v8 ignore else -- needs a registry that is already known
	if (!packageRegistries.some((item) => item.registryUrl === url.registryUrl && item.scope === url.scope && item.registryType === url.registryType && item.content === url.content)) packageRegistries.push(url);
}
function matchesContentDescriptor(dep, contentDescriptors) {
	const [groupId, artifactId] = (dep.packageName ?? dep.depName).split(":");
	let hasIncludes = false;
	let hasExcludes = false;
	let matchesInclude = false;
	let matchesExclude = false;
	for (const content of coerceArray(contentDescriptors)) {
		const { mode, matcher, groupId: contentGroupId, artifactId: contentArtifactId, version: contentVersion } = content;
		let groupMatch = false;
		if (matcher === "regex") groupMatch = regEx(contentGroupId).test(groupId);
		else if (matcher === "subgroup") groupMatch = groupId === contentGroupId || `${groupId}.`.startsWith(contentGroupId);
		else groupMatch = groupId === contentGroupId;
		let artifactMatch = true;
		if (groupMatch && contentArtifactId) {
			if (matcher === "regex") artifactMatch = regEx(contentArtifactId).test(artifactId);
			else artifactMatch = artifactId === contentArtifactId;
		}
		let versionMatch = true;
		if (groupMatch && artifactMatch && contentVersion && dep.currentValue) {
			if (matcher === "regex") versionMatch = regEx(contentVersion).test(dep.currentValue);
			else versionMatch = api.matches(dep.currentValue, contentVersion);
		}
		const isMatch = groupMatch && artifactMatch && versionMatch;
		if (mode === "include") {
			hasIncludes = true;
			if (isMatch) matchesInclude = true;
		} else {
			hasExcludes = true;
			if (isMatch) matchesExclude = true;
		}
	}
	if (hasIncludes && hasExcludes) return matchesInclude && !matchesExclude;
	if (hasIncludes) return matchesInclude;
	if (hasExcludes) return !matchesExclude;
	return true;
}
function getRegistryUrlsForDep(packageRegistries, dep) {
	const scope = dep.depType === "plugin" ? "plugin" : "dep";
	const matchingRegistries = packageRegistries.filter((item) => item.scope === scope && matchesContentDescriptor(dep, item.content));
	const exclusiveRegistries = matchingRegistries.filter((item) => item.registryType === "exclusive");
	const registryUrls = (exclusiveRegistries.length ? exclusiveRegistries : matchingRegistries).map((item) => item.registryUrl);
	if (!registryUrls.length && scope === "plugin") registryUrls.push(REGISTRY_URLS.gradlePluginPortal);
	return [...new Set(registryUrls)];
}
async function parsePackageFiles(config, packageFiles, extractedDeps, packageFilesByName, packageRegistries) {
	const varRegistry = {};
	const fileContents = await getLocalFiles(packageFiles);
	for (const packageFile of packageFiles) {
		packageFilesByName[packageFile] = {
			packageFile,
			datasource: mavenDatasource,
			deps: []
		};
		try {
			const content = fileContents[packageFile];
			const packageFileDir = upath.dirname(toAbsolutePath(packageFile));
			if (isPropsFile(packageFile)) {
				const { vars, deps } = parseProps(content, packageFile);
				updateVars(varRegistry, packageFileDir, vars);
				extractedDeps.push(...deps);
			} else if (isTOMLFile(packageFile)) {
				const { vars, deps } = parseCatalog(packageFile, content);
				updateVarsFromDefaultCatalog(varRegistry, packageFileDir, packageFile, vars);
				extractedDeps.push(...deps);
			} else if (isGcvPropsFile(packageFile) && usesGcv(packageFile, fileContents)) {
				const deps = parseGcv(packageFile, fileContents);
				extractedDeps.push(...deps);
			} else if (isKotlinSourceFile(packageFile)) {
				const vars = getVars(varRegistry, packageFileDir);
				const { vars: gradleVars, deps } = parseKotlinSource(content, vars, packageFile);
				updateVars(varRegistry, "/", gradleVars);
				extractedDeps.push(...deps);
			} else if (isGradleScriptFile(packageFile)) {
				const vars = getVars(varRegistry, packageFileDir);
				const { deps, urls, vars: gradleVars } = parseGradle(content, vars, packageFile, fileContents);
				updatePackageRegistries(packageRegistries, urls);
				updateVars(varRegistry, packageFileDir, gradleVars);
				extractedDeps.push(...deps);
			}
		} catch (err) {
			logger.debug({
				err,
				config,
				packageFile
			}, `Failed to process Gradle file`);
		}
	}
	return extractedDeps;
}
async function extractAllPackageFiles(config, packageFiles) {
	const packageFilesByName = {};
	const packageRegistries = [];
	const extractedDeps = [];
	const kotlinSourceFiles = packageFiles.filter(isKotlinSourceFile);
	const gradleFiles = reorderFiles(packageFiles.filter((e) => !kotlinSourceFiles.includes(e)));
	await parsePackageFiles(config, [
		...kotlinSourceFiles,
		...kotlinSourceFiles,
		...gradleFiles
	], extractedDeps, packageFilesByName, packageRegistries);
	if (!extractedDeps.length) return null;
	unifyCatalogSharedVariableNames(extractedDeps);
	for (const dep of extractedDeps) {
		dep.fileReplacePosition = dep?.managerData?.fileReplacePosition;
		const key = dep.managerData?.packageFile;
		// istanbul ignore else
		if (key) {
			let pkgFile = packageFilesByName[key];
			// istanbul ignore if: won't happen if "apply from" processes only initially known files
			if (!pkgFile) pkgFile = {
				packageFile: key,
				datasource: mavenDatasource,
				deps: []
			};
			dep.datasource ??= mavenDatasource;
			// v8 ignore else -- every dep here defaults to the maven datasource above
			if (dep.datasource === mavenDatasource) {
				dep.registryUrls = getRegistryUrlsForDep(packageRegistries, dep);
				dep.depType ??= key.startsWith("buildSrc") && !kotlinSourceFiles.length ? "devDependencies" : "dependencies";
			}
			if (!pkgFile.deps.some((item) => item.depName === dep.depName && item.managerData?.fileReplacePosition === dep.managerData?.fileReplacePosition)) pkgFile.deps.push(dep);
			packageFilesByName[key] = pkgFile;
		} else logger.debug({ dep }, `Failed to process Gradle dependency`);
	}
	return Object.values(packageFilesByName);
}
//#endregion
export { extractAllPackageFiles, matchesContentDescriptor };

//# sourceMappingURL=extract.js.map