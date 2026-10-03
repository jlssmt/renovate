import { regEx } from "../../../util/regex.js";
import { find } from "../../../util/host-rules.js";
import { parseRegistryUrl } from "../../datasource/nuget/common.js";
import { NugetDatasource } from "../../datasource/nuget/index.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/nuget/config-formatter.ts
function createNuGetConfigXml(registries) {
	let contents = `<?xml version="1.0" encoding="utf-8"?>\n<configuration>\n<packageSources>\n`;
	let unnamedRegistryCount = 0;
	const credentials = [];
	const packageSourceMaps = [];
	const seenUrls = /* @__PURE__ */ new Set();
	for (const registry of registries) {
		if (seenUrls.has(registry.url)) continue;
		seenUrls.add(registry.url);
		const registryName = registry.name ?? `Package source ${++unnamedRegistryCount}`;
		const registryInfo = parseRegistryUrl(registry.url);
		contents += formatPackageSourceElement(registryInfo, registryName);
		const { password, username } = find({
			hostType: NugetDatasource.id,
			url: registry.url
		});
		if (isNonEmptyString(password) || isNonEmptyString(username)) credentials.push({
			name: registryName,
			password,
			username
		});
		if (registry.sourceMappedPackagePatterns) packageSourceMaps.push({
			name: registryName,
			patterns: registry.sourceMappedPackagePatterns
		});
	}
	contents += "</packageSources>\n";
	if (credentials.length > 0) {
		contents += "<packageSourceCredentials>\n";
		for (const credential of credentials) contents += formatPackageSourceCredentialElement(credential);
		contents += "</packageSourceCredentials>\n";
	}
	if (packageSourceMaps.length > 0) {
		contents += "<packageSourceMapping>\n";
		for (const packageSourceMap of packageSourceMaps) contents += formatPackageSource(packageSourceMap);
		contents += "</packageSourceMapping>";
	}
	contents += "</configuration>\n";
	return contents;
}
function formatPackageSourceElement(registryInfo, name) {
	let element = `<add key="${name}" value="${registryInfo.feedUrl}" `;
	// v8 ignore else -- the registry url always resolves to a protocol version
	if (registryInfo.protocolVersion) element += `protocolVersion="${registryInfo.protocolVersion}" `;
	return `${element}/>\n`;
}
function formatPackageSourceCredentialElement(credential) {
	const escapedName = escapeName(credential.name);
	let packageSourceCredential = `<${escapedName}>\n`;
	if (credential.username) packageSourceCredential += `<add key="Username" value="${credential.username}" />\n`;
	// v8 ignore else -- needs a host rule with a username but no password
	if (credential.password) packageSourceCredential += `<add key="ClearTextPassword" value="${credential.password}" />\n`;
	packageSourceCredential += `<add key="ValidAuthenticationTypes" value="basic" />`;
	packageSourceCredential += `</${escapedName}>\n`;
	return packageSourceCredential;
}
function formatPackageSource(packageSourceMap) {
	let packageSource = `<packageSource key="${packageSourceMap.name}">\n`;
	for (const pattern of packageSourceMap.patterns) packageSource += `<package pattern="${pattern}" />\n`;
	return `${packageSource}</packageSource>\n`;
}
const charactersToEscape = regEx(/[^A-Za-z0-9\-_.]/);
function escapeName(name) {
	let escapedName = "";
	for (const char of name) if (char.match(charactersToEscape)) escapedName += `_x${char.codePointAt(0).toString(16).padStart(4, "0")}_`;
	else escapedName += char;
	return escapedName;
}
//#endregion
export { createNuGetConfigXml };

//# sourceMappingURL=config-formatter.js.map