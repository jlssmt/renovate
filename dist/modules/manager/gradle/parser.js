import { newlineRegex, regEx } from "../../../util/regex.js";
import { qKotlinImport } from "./parser/common.js";
import { parseDependencyString } from "./utils.js";
import { setParseGradleFunc } from "./parser/handlers.js";
import { qApplyFrom } from "./parser/apply-from.js";
import { qDependencies, qLongFormDep } from "./parser/dependencies.js";
import { qAssignments } from "./parser/assignments.js";
import { qToolchainVersion } from "./parser/language-version.js";
import { qKotlinMultiObjectVarAssignment } from "./parser/objects.js";
import { qPlugins } from "./parser/plugins.js";
import { qRegistryUrls } from "./parser/registry-urls.js";
import { qVersionCatalogs } from "./parser/version-catalogs.js";
import { lang, query } from "@renovatebot/good-enough-parser";
//#region lib/modules/manager/gradle/parser.ts
const groovy = lang.createLang("groovy");
const ctx = {
	packageFile: "",
	fileContents: {},
	recursionDepth: 0,
	globalVars: {},
	deps: [],
	registryUrls: [],
	varTokens: [],
	tmpKotlinImportStore: [],
	tmpNestingDepth: [],
	tmpRegistryContent: [],
	tmpTokenStore: {},
	tokenMap: {}
};
setParseGradleFunc(parseGradle);
function parseGradle(input, initVars = {}, packageFile = "", fileContents = {}, recursionDepth = 0) {
	let vars = { ...initVars };
	const deps = [];
	const urls = [];
	const query$1 = query.tree({
		type: "root-tree",
		search: query.alt(qKotlinImport, qAssignments, qKotlinMultiObjectVarAssignment, qDependencies, qPlugins, qRegistryUrls, qVersionCatalogs, qLongFormDep, qApplyFrom)
	});
	const parsedResult = groovy.query(input, query$1, {
		...ctx,
		packageFile,
		fileContents,
		recursionDepth,
		globalVars: vars
	});
	if (parsedResult) {
		deps.push(...parsedResult.deps);
		vars = {
			...vars,
			...parsedResult.globalVars
		};
		urls.push(...parsedResult.registryUrls);
	}
	return {
		deps,
		urls,
		vars
	};
}
function parseKotlinSource(input, initVars = {}, packageFile = "") {
	let vars = { ...initVars };
	const deps = [];
	const query$2 = query.tree({
		type: "root-tree",
		maxDepth: 1,
		search: qKotlinMultiObjectVarAssignment
	});
	const parsedResult = groovy.query(input, query$2, {
		...ctx,
		packageFile,
		globalVars: vars
	});
	// v8 ignore else -- every parsed script yields a result here
	if (parsedResult) {
		deps.push(...parsedResult.deps);
		vars = {
			...vars,
			...parsedResult.globalVars
		};
	}
	return {
		deps,
		vars
	};
}
function parseJavaToolchainVersion(input) {
	return groovy.query(input, qToolchainVersion, {})?.javaLanguageVersion ?? null;
}
const propRegex = regEx(`^(?<leftPart>\\s*(?<key>[a-zA-Z_][a-zA-Z0-9_]*(?:\\.[a-zA-Z_][a-zA-Z0-9_]*)*)\\s*[= :]\\s*['"]?)(?<value>[^\\s'"]+)['"]?\\s*$`);
function parseProps(input, packageFile) {
	let offset = 0;
	const vars = {};
	const deps = [];
	for (const line of input.split(newlineRegex)) {
		const lineMatch = propRegex.exec(line);
		if (lineMatch?.groups) {
			const { key, value, leftPart } = lineMatch.groups;
			const replacePosition = offset + leftPart.length;
			const dep = parseDependencyString(value);
			if (dep) deps.push({
				...dep,
				managerData: {
					fileReplacePosition: replacePosition + dep.depName.length + 1,
					packageFile
				}
			});
			else vars[key] = {
				key,
				value,
				fileReplacePosition: replacePosition,
				packageFile
			};
		}
		offset += line.length + 1;
	}
	return {
		vars,
		deps
	};
}
//#endregion
export { parseGradle, parseJavaToolchainVersion, parseKotlinSource, parseProps };

//# sourceMappingURL=parser.js.map