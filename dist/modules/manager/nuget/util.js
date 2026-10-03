import { regEx } from "../../../util/regex.js";
import { minimatch } from "../../../util/minimatch.js";
import { logger } from "../../../logger/index.js";
import { findLocalSiblingOrParent, findUpLocal, readLocalFile } from "../../../util/fs/index.js";
import { nugetOrg } from "../../datasource/nuget/index.js";
import { GlobalJson } from "./schema.js";
import upath from "upath";
import { XmlDocument } from "xmldoc";
//#region lib/modules/manager/nuget/util.ts
async function readFileAsXmlDocument(file) {
	try {
		const doc = new XmlDocument(await readLocalFile(file, "utf8"));
		return doc?.firstChild ? doc : void 0;
	} catch (err) {
		logger.debug({
			err,
			file
		}, `failed to parse file as XML document`);
		return;
	}
}
/**
* The default `nuget.org` named registry.
* @returns the default registry for NuGet
*/
function getDefaultRegistries() {
	return [{
		url: nugetOrg,
		name: "nuget.org"
	}];
}
async function getConfiguredRegistries(packageFile) {
	const nuGetConfigPath = await findUpLocal([
		"nuget.config",
		"NuGet.config",
		"NuGet.Config"
	], upath.dirname(packageFile));
	if (!nuGetConfigPath) return;
	logger.debug(`Found NuGet.config at ${nuGetConfigPath}`);
	const nuGetConfig = await readFileAsXmlDocument(nuGetConfigPath);
	if (!nuGetConfig) return;
	const packageSources = nuGetConfig.childNamed("packageSources");
	if (!packageSources) return;
	const packageSourceMapping = nuGetConfig.childNamed("packageSourceMapping");
	let registries = getDefaultRegistries();
	for (const registry of registries) registry.sourceMappedPackagePatterns = packageSourceMapping?.childWithAttribute("key", registry.name)?.childrenNamed("package").map((packagePattern) => packagePattern.attr.pattern);
	for (const child of packageSources.children) if (isXmlElement(child)) {
		if (child.name === "clear") {
			logger.debug(`clearing registry URLs`);
			registries.length = 0;
		} else if (child.name === "add") {
			if (regEx(/^https?:\/\//i).test(child.attr.value)) {
				let registryUrl = child.attr.value;
				if (child.attr.protocolVersion) registryUrl += `#protocolVersion=${child.attr.protocolVersion}`;
				const sourceMappedPackagePatterns = packageSourceMapping?.childWithAttribute("key", child.attr.key)?.childrenNamed("package").map((packagePattern) => packagePattern.attr.pattern);
				logger.debug({
					name: child.attr.key,
					registryUrl,
					sourceMappedPackagePatterns
				}, `Adding registry URL ${registryUrl}`);
				registries.push({
					name: child.attr.key,
					url: registryUrl,
					sourceMappedPackagePatterns
				});
			} else logger.debug({ registryUrl: child.attr.value }, "ignoring local registry URL");
		}
	}
	const disabledPackageSources = nuGetConfig.childNamed("disabledPackageSources");
	if (disabledPackageSources) {
		for (const child of disabledPackageSources.children) if (isXmlElement(child) && child.name === "add" && child.attr.value === "true") {
			const disabledRegistryKey = child.attr.key;
			registries = registries.filter((o) => o.name !== disabledRegistryKey);
			logger.debug(`Disabled registry with key: ${disabledRegistryKey}`);
		}
	}
	const plainRegistryUrls = registries.filter((r) => !r.sourceMappedPackagePatterns).map((r) => r.url);
	registries = registries.filter((r) => {
		return r.sourceMappedPackagePatterns ?? !plainRegistryUrls.includes(`${r.url}#protocolVersion=3`);
	});
	return registries;
}
function isXmlElement(child) {
	return child.type === "element";
}
function findVersion(parsedXml) {
	for (const tag of ["Version", "VersionPrefix"]) for (const l1Elem of parsedXml.childrenNamed("PropertyGroup")) for (const l2Elem of l1Elem.childrenNamed(tag)) return l2Elem;
	return null;
}
function applyRegistries(dep, registries) {
	if (registries) {
		if (!registries.some((reg) => reg.sourceMappedPackagePatterns)) {
			dep.registryUrls = registries.map((reg) => reg.url);
			return dep;
		}
		const regs = registries.filter((r) => r.sourceMappedPackagePatterns);
		const map = new Map(regs.flatMap((r) => r.sourceMappedPackagePatterns.map((p) => [p, []])));
		const depName = dep.depName;
		for (const reg of regs) for (const pattern of reg.sourceMappedPackagePatterns) map.get(pattern).push(reg);
		const urls = [];
		for (const [pattern, regs] of [...map].sort(sortPatterns)) if (minimatch(pattern, { nocase: true }).match(depName)) {
			urls.push(...regs.map((r) => r.url));
			break;
		}
		// v8 ignore else -- the loop above always finds at least one registry
		if (urls.length) dep.registryUrls = urls;
	}
	return dep;
}
function sortPatterns(a, b) {
	if (a[0].endsWith("*") && !b[0].endsWith("*")) return 1;
	if (!a[0].endsWith("*") && b[0].endsWith("*")) return -1;
	const aTrim = a[0].slice(0, -1);
	const bTrim = b[0].slice(0, -1);
	return aTrim.localeCompare(bTrim) * -1;
}
async function findGlobalJson(packageFile) {
	const globalJsonPath = await findLocalSiblingOrParent(packageFile, "global.json");
	if (!globalJsonPath) return null;
	const content = await readLocalFile(globalJsonPath, "utf8");
	if (!content) {
		logger.debug({
			packageFile,
			globalJsonPath
		}, "Failed to read global.json");
		return null;
	}
	const result = await GlobalJson.safeParseAsync(content);
	if (!result.success) {
		logger.debug({
			packageFile,
			globalJsonPath,
			err: result.error
		}, "Failed to parse global.json");
		return null;
	}
	return result.data;
}
//#endregion
export { applyRegistries, findGlobalJson, findVersion, getConfiguredRegistries, getDefaultRegistries, isXmlElement, readFileAsXmlDocument };

//# sourceMappingURL=util.js.map