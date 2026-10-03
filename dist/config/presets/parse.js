import { regEx } from "../../util/regex.js";
import { isHttpUrl } from "../../util/url.js";
import { PRESET_INVALID, PRESET_PROHIBITED_SUBPRESET } from "./util.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
//#region lib/config/presets/parse.ts
const nonScopedPresetWithSubdirRegex = regEx(/^(?<repo>~?[\w\-. /%]+?)\/\/(?:(?<presetPath>[\w\-./]+)\/)?(?<presetName>[\w\-.]+)(?:#(?<tag>[\w\-./]+?))?$/);
const gitPresetRegex = regEx(/^(?<repo>~?[\w\-. /%]+)(?::(?<presetName>[\w\-.+/]+))?(?:#(?<tag>[\w\-./]+?))?$/);
const relativePresetRegex = regEx(/^(?:\/|(?:\.\.?\/)+)[\w\-.]+(?:\/[\w\-.]+)*$/);
/**
* Returns true if the given `extends` entry is a relative preset reference,
* e.g. `./foo`, `../foo` or `/foo`.
*/
function isRelativePresetReference(input) {
	return input.startsWith("./") || input.startsWith("../") || input.startsWith("/");
}
/**
* Splits the trailing `(...)` parameter list off the given preset reference.
*
* The parameters are opaque, so they may contain any character and are split
* off before the reference itself is validated.
*/
function splitPresetParams(input) {
	if (!input.includes("(")) return {
		str: input,
		params: void 0,
		rawParams: void 0
	};
	const rawParams = input.slice(input.indexOf("(") + 1, -1);
	return {
		str: input.slice(0, input.indexOf("(")),
		params: rawParams.split(",").map((elem) => elem.trim()),
		rawParams
	};
}
/**
* Returns true if every parenthesis in the given preset parameters is closed in
* order, which allows Handlebars sub-expressions like `{{ lower (env.TEAM) }}`
* while still rejecting malformed parameter lists.
*/
function hasBalancedParens(rawParams) {
	let depth = 0;
	for (const char of rawParams) if (char === "(") depth += 1;
	else if (char === ")") {
		depth -= 1;
		if (depth < 0) return false;
	}
	return depth === 0;
}
function parsePreset(input) {
	let str = input;
	let presetSource;
	let presetPath;
	let repo;
	let presetName;
	let tag;
	let rawParams;
	let params;
	if (str.startsWith("github>")) {
		presetSource = "github";
		str = str.substring(7);
	} else if (str.startsWith("gitlab>")) {
		presetSource = "gitlab";
		str = str.substring(7);
	} else if (str.startsWith("gitea>")) {
		presetSource = "gitea";
		str = str.substring(6);
	} else if (str.startsWith("forgejo>")) {
		presetSource = "forgejo";
		str = str.substring(8);
	} else if (str.startsWith("local>")) {
		presetSource = "local";
		str = str.substring(6);
	} else if (str.startsWith("npm>@")) {
		presetSource = "npm";
		str = str.substring(4);
	} else if (isRelativePresetReference(str)) presetSource = "relative";
	else if (isHttpUrl(str)) presetSource = "http";
	else if (!str.startsWith("@") && !str.startsWith(":") && str.includes("/")) presetSource = "local";
	str = str.replace(regEx(/^npm>/), "");
	if (presetSource && presetSource !== "relative" && isRelativePresetReference(str)) throw new Error(PRESET_INVALID);
	presetSource = presetSource ?? "npm";
	if (presetSource === "relative") {
		if (str.includes("(") && !str.endsWith(")")) throw new Error(PRESET_INVALID);
		({str, params, rawParams} = splitPresetParams(str));
		if (isString(rawParams) && !hasBalancedParens(rawParams)) throw new Error(PRESET_INVALID);
		if (!relativePresetRegex.test(str)) throw new Error(PRESET_INVALID);
		const finalSegment = str.split("/").pop();
		if (finalSegment === "." || finalSegment === "..") throw new Error(PRESET_INVALID);
		return {
			presetSource,
			repo: "",
			presetName: str,
			params,
			rawParams
		};
	}
	({str, params, rawParams} = splitPresetParams(str));
	if (presetSource === "http") return {
		presetSource,
		repo: str,
		presetName: "",
		params,
		rawParams
	};
	if ([
		"abandonments",
		"compatibility",
		"config",
		"customManagers",
		"default",
		"docker",
		"global",
		"group",
		"helpers",
		"mergeConfidence",
		"monorepo",
		"npm",
		"packages",
		"preview",
		"replacements",
		"schedule",
		"security",
		"workarounds"
	].some((presetPackage) => str.startsWith(`${presetPackage}:`))) {
		presetSource = "internal";
		[repo, presetName] = str.split(":");
	} else if (str.startsWith(":")) {
		presetSource = "internal";
		repo = "default";
		presetName = str.slice(1);
	} else if (str.startsWith("@")) {
		repo = regEx(/(?<scope>@.*?)(?::|$)/).exec(str).groups.scope;
		str = str.slice(repo.length);
		if (!repo.includes("/")) repo += "/renovate-config";
		if (str === "") presetName = "default";
		else presetName = str.slice(1);
	} else if (str.includes("//")) {
		if (str.includes(":")) throw new Error(PRESET_PROHIBITED_SUBPRESET);
		if (!nonScopedPresetWithSubdirRegex.test(str)) throw new Error(PRESET_INVALID);
		({repo, presetPath, presetName, tag} = nonScopedPresetWithSubdirRegex.exec(str).groups);
	} else {
		({repo, presetName, tag} = gitPresetRegex.exec(str).groups);
		if (presetSource === "npm" && !repo.startsWith("renovate-config-")) repo = `renovate-config-${repo}`;
		if (!isNonEmptyString(presetName)) presetName = "default";
	}
	return {
		presetSource,
		presetPath,
		repo,
		presetName,
		tag,
		params,
		rawParams
	};
}
//#endregion
export { isRelativePresetReference, parsePreset };

//# sourceMappingURL=parse.js.map