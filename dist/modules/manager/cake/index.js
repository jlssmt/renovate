import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { regEx } from "../../../util/regex.js";
import { isHttpUrl, parseUrl } from "../../../util/url.js";
import { NugetDatasource } from "../../datasource/nuget/index.js";
import { applyRegistries, getConfiguredRegistries } from "../nuget/util.js";
import moo from "moo";
//#region lib/modules/manager/cake/index.ts
var cake_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const url = "https://cakebuild.net/docs";
const categories = ["dotnet"];
const defaultConfig = { managerFilePatterns: ["/\\.cake$/"] };
const supportedDatasources = [NugetDatasource.id];
const lexer = moo.states({ main: {
	lineComment: { match: /\/\/.*?$/ },
	multiLineComment: {
		match: /\/\*[^]*?\*\//,
		lineBreaks: true
	},
	dependency: { match: /^#(?:addin|tool|module|load|l)\s+(?:nuget|dotnet):.*$/ },
	dependencyQuoted: {
		match: /^#(?:addin|tool|module|load|l)\s+"(?:nuget|dotnet):[^"]+"\s*$/,
		value: (s) => s.trim().slice(1, -1)
	},
	dependencyFromInstallTools: {
		match: /(?:InstallTools?\s*\()[^)]+(?:\s*\)\s*;)/,
		lineBreaks: true
	},
	unknown: moo.fallback
} });
function parseDependencyLine(line) {
	let url = line.replace(regEx(/^[^:]*:/), "");
	const isEmptyHost = url.startsWith("?");
	url = isEmptyHost ? `http://localhost/${url}` : url;
	const parsedUrl = parseUrl(url);
	if (!parsedUrl) return null;
	const { origin, pathname, searchParams } = parsedUrl;
	const registryUrl = `${origin}${pathname}`;
	const depName = searchParams.get("package");
	const currentValue = searchParams.get("version") ?? void 0;
	const result = {
		datasource: NugetDatasource.id,
		depName,
		currentValue
	};
	if (!isEmptyHost) {
		if (isHttpUrl(parsedUrl)) result.registryUrls = [registryUrl];
		else result.skipReason = "unsupported-url";
	}
	return result;
}
function parseAndPushDependencyLine(registries, deps, value) {
	const dep = parseDependencyLine(value);
	if (dep) {
		applyRegistries(dep, registries);
		deps.push(dep);
	}
}
async function extractPackageFile(content, packageFile, _config) {
	const deps = [];
	const registries = await getConfiguredRegistries(packageFile);
	lexer.reset(content);
	let token = lexer.next();
	while (token) {
		const { type, value } = token;
		if (type === "dependency" || type === "dependencyQuoted") parseAndPushDependencyLine(registries, deps, value);
		else if (type === "dependencyFromInstallTools") {
			const matches = value.matchAll(regEx(/"dotnet:[^"]+"/g));
			for (const match of matches) parseAndPushDependencyLine(registries, deps, match.toString().slice(1, -1));
		}
		token = lexer.next();
	}
	return { deps };
}
//#endregion
export { cake_exports, categories, defaultConfig, extractPackageFile, supportedDatasources, url };

//# sourceMappingURL=index.js.map