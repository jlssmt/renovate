import { CONFIG_VALIDATION } from "../../constants/error-messages.js";
import { get, set } from "../../util/cache/memory/index.js";
import { regEx } from "../../util/regex.js";
import { GlobalConfig } from "../global.js";
import { coerceArray } from "../../util/array.js";
import { logger } from "../../logger/index.js";
import { clone } from "../../util/clone.js";
import { massageConfig } from "../massage.js";
import { removedPresets } from "./common.js";
import { mergeChildConfig } from "../utils.js";
import { migrateConfig } from "../migration.js";
import { compile } from "../../util/template/index.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { getPreset as getPreset$1, isInternal } from "./internal/index.js";
import { PRESET_DEP_NOT_FOUND, PRESET_RELATIVE_NO_PARENT } from "./util.js";
import { parsePreset } from "./parse.js";
import { canonicalizeRelativePresets } from "./relative.js";
import { isArray, isNullOrUndefined, isObject, isString } from "@sindresorhus/is";
//#region lib/config/presets/index.ts
const presetSources = {
	forgejo: {
		load: () => import("./forgejo/index.js"),
		repoHosted: true
	},
	gitea: {
		load: () => import("./gitea/index.js"),
		repoHosted: true
	},
	github: {
		load: () => import("./github/index.js"),
		repoHosted: true
	},
	gitlab: {
		load: () => import("./gitlab/index.js"),
		repoHosted: true
	},
	http: {
		load: () => import("./http/index.js"),
		repoHosted: false
	},
	local: {
		load: () => import("./local/index.js"),
		repoHosted: true
	},
	npm: {
		load: () => import("./npm/index.js"),
		repoHosted: false
	}
};
const presetCacheNamespace = "preset";
function replaceArgs(obj, argMapping) {
	if (isString(obj)) {
		let returnStr = obj;
		for (const [arg, argVal] of Object.entries(argMapping)) {
			const re = regEx(`{{${arg}}}`, "g", false);
			returnStr = returnStr.replace(re, argVal);
		}
		return returnStr;
	}
	if (isArray(obj)) {
		const returnArray = [];
		for (const item of obj) returnArray.push(replaceArgs(item, argMapping));
		return returnArray;
	}
	if (isObject(obj)) {
		const returnObj = {};
		for (const [key, val] of Object.entries(obj)) returnObj[key] = replaceArgs(val, argMapping);
		return returnObj;
	}
	return obj;
}
async function getPreset(preset, baseConfig) {
	logger.trace(`getPreset(${preset})`);
	const newPreset = removedPresets[preset];
	if (newPreset) return getPreset(newPreset, baseConfig);
	if (newPreset === null) return {};
	const parsedPreset = parsePreset(preset);
	const { presetSource, repo, presetPath, presetName, tag, params, rawParams } = parsedPreset;
	if (presetSource === "relative") throw new Error(PRESET_RELATIVE_NO_PARENT);
	let presetConfig;
	if (presetSource === "internal") presetConfig = getPreset$1({
		repo,
		presetPath,
		presetName,
		tag
	});
	else {
		const cacheKey = `preset:${preset}`;
		const packageCache = GlobalConfig.get("presetCachePersistence") ? await import("../../util/cache/package/index.js") : void 0;
		if (packageCache) presetConfig = await packageCache.get(presetCacheNamespace, cacheKey);
		else presetConfig = get(cacheKey);
		if (isNullOrUndefined(presetConfig)) {
			presetConfig = await (await presetSources[presetSource].load()).getPreset({
				repo,
				presetPath,
				presetName,
				tag
			});
			if (packageCache) await packageCache.set(presetCacheNamespace, cacheKey, presetConfig, 15);
			else set(cacheKey, presetConfig);
		}
	}
	if (!presetConfig) throw new Error(PRESET_DEP_NOT_FOUND);
	logger.trace({ presetConfig }, `Found preset ${preset}`);
	if (params) {
		const argMapping = {};
		for (const [index, value] of params.entries()) argMapping[`arg${index}`] = value;
		if (rawParams) argMapping.args = rawParams;
		presetConfig = replaceArgs(presetConfig, argMapping);
	}
	logger.trace({ presetConfig }, `Applied params to preset ${preset}`);
	const presetKeys = Object.keys(presetConfig);
	if (presetKeys.length === 2 && presetKeys.includes("description") && presetKeys.includes("extends")) delete presetConfig.description;
	const packageListKeys = ["description", "matchPackageNames"];
	if (presetKeys.every((key) => packageListKeys.includes(key))) delete presetConfig.description;
	const { migratedConfig } = migrateConfig(presetConfig);
	const massagedConfig = massageConfig(migratedConfig);
	if (presetSources[parsedPreset.presetSource]?.repoHosted) canonicalizeRelativePresets(massagedConfig, parsedPreset);
	return massagedConfig;
}
/**
* @param [mergeInternalPresets=true] when resolving the config presets, whether to merge Renovate internal presets into the resulting configuration.
*   When set to `false`, this will resolve these internal presets (recursively), but not merge them.
*   This is primarily intended to be used by "shallow config" resolution (for logging purposes).
*/
async function resolveConfigPresets(inputConfig, baseConfig, _ignorePresets, existingPresets = [], mergeInternalPresets = true) {
	const allVisitedPresets = {
		merged: /* @__PURE__ */ new Set(),
		unmerged: /* @__PURE__ */ new Set()
	};
	let ignorePresets = clone(_ignorePresets);
	if (!ignorePresets || ignorePresets.length === 0) ignorePresets = coerceArray(inputConfig.ignorePresets);
	logger.trace({
		config: inputConfig,
		existingPresets,
		mergeInternalPresets
	}, "resolveConfigPresets");
	let config = {};
	if (inputConfig.extends?.length) {
		inputConfig.extends = inputConfig.extends.map((tmpl) => compile(tmpl, {}));
		for (const preset of inputConfig.extends) {
			if (!mergeInternalPresets && isInternal(preset)) {
				logger.once.trace({
					ignoredPreset: preset,
					mergeInternalPresets
				}, "Not merging preset");
				allVisitedPresets.unmerged.add(preset);
				continue;
			}
			if (shouldResolvePreset(preset, existingPresets, ignorePresets)) {
				logger.trace(`Resolving preset "${preset}"`);
				const { config: presetConfig, visitedPresets } = await resolveConfigPresets(await fetchPreset(preset, baseConfig, inputConfig, existingPresets), baseConfig ?? inputConfig, ignorePresets, existingPresets.concat([preset]), mergeInternalPresets);
				config = mergeChildConfig(config, presetConfig);
				allVisitedPresets.merged.add(preset);
				for (const mergedPreset of visitedPresets.merged) allVisitedPresets.merged.add(mergedPreset);
				for (const unmergedPreset of visitedPresets.unmerged) allVisitedPresets.unmerged.add(unmergedPreset);
			}
		}
	}
	logger.trace({ config }, `Post-preset resolve config`);
	config = mergeChildConfig(config, inputConfig);
	delete config.extends;
	delete config.ignorePresets;
	if (config.overrideDescription?.length) config.description = config.overrideDescription;
	delete config.overrideDescription;
	logger.trace({ config }, `Post-merge resolve config`);
	for (const [key, val] of Object.entries(config)) {
		const ignoredKeys = ["content", "onboardingConfig"];
		if (isArray(val)) {
			config[key] = [];
			for (const element of val) if (isObject(element)) {
				const { config: presetConfig, visitedPresets: visited } = await resolveConfigPresets(element, baseConfig, ignorePresets, existingPresets, mergeInternalPresets);
				config[key].push(presetConfig);
				for (const mergedPreset of visited.merged) allVisitedPresets.merged.add(mergedPreset);
				for (const unmergedPreset of visited.unmerged) allVisitedPresets.unmerged.add(unmergedPreset);
			} else config[key].push(element);
		} else if (isObject(val) && !ignoredKeys.includes(key)) {
			logger.trace(`Resolving object "${key}"`);
			const { config: presetConfig, visitedPresets: visited } = await resolveConfigPresets(val, baseConfig, ignorePresets, existingPresets, mergeInternalPresets);
			config[key] = presetConfig;
			for (const mergedPreset of visited.merged) allVisitedPresets.merged.add(mergedPreset);
			for (const unmergedPreset of visited.unmerged) allVisitedPresets.unmerged.add(unmergedPreset);
		}
	}
	logger.trace({ config: inputConfig }, "Input config");
	logger.trace({
		config,
		visitedPresets: allVisitedPresets
	}, "Resolved config");
	return {
		config,
		visitedPresets: {
			merged: Array.from(allVisitedPresets.merged),
			unmerged: Array.from(allVisitedPresets.unmerged)
		}
	};
}
async function fetchPreset(preset, baseConfig, inputConfig, existingPresets) {
	try {
		return await getPreset(preset, baseConfig ?? inputConfig);
	} catch (err) {
		logger.debug({
			preset,
			err
		}, "Preset fetch error");
		if (err instanceof ExternalHostError) throw err;
		if (err.message === "rate-limit-exceeded") throw err;
		const error = new Error(CONFIG_VALIDATION);
		if (err.message === "host-blocked") {
			logger.warn({
				preset,
				documentationUrl: `${GlobalConfig.get("productLinks").documentation}self-hosted-configuration/#hostrulesallowinternal`
			}, "Preset host is blocked by this Renovate instance");
			error.validationError = `Preset host is blocked by this Renovate instance (${preset}). If this is intended, ask your Renovate administrator to permit it with a \`hostRules\` entry setting \`allowInternal=true\`, scoped either by \`hostType\` (for example \`preset\` or \`npm\`) or by a URL-prefix \`matchHost\``;
		} else if (err.message === "dep not found") error.validationError = `Cannot find preset's package (${preset})`;
		else if (err.message === "preset renovate-config not found") error.validationError = `Preset package is missing a renovate-config entry (${preset})`;
		else if (err.message === "preset not found") error.validationError = `Preset name not found within published preset config (${preset})`;
		else if (err.message === "invalid preset") error.validationError = `Preset is invalid (${preset})`;
		else if (err.message === "prohibited sub-preset") error.validationError = `Sub-presets cannot be combined with a custom path (${preset})`;
		else if (err.message === "invalid preset JSON") error.validationError = `Preset is invalid JSON (${preset})`;
		else if (err.message === "relative preset has no parent") error.validationError = `Relative preset reference cannot be resolved (${preset}). Relative presets can only be used within presets from a supported source, must stay inside their repository, and cannot be templated or used outside of a preset (for example in the repository config, inherited config, or globalExtends)`;
		else error.validationError = `Preset caused unexpected error (${preset})`;
		if (existingPresets.length) error.validationError += ". Note: this is a *nested* preset so please contact the preset author if you are unable to fix it yourself.";
		logger.info({ validationError: error.validationError }, "Throwing preset error");
		throw error;
	}
}
function shouldResolvePreset(preset, existingPresets, ignorePresets) {
	if (existingPresets.includes(preset)) {
		logger.debug(`Already seen preset ${preset} in [${existingPresets.join(", ")}]`);
		return false;
	}
	if (ignorePresets.includes(preset)) {
		logger.debug(`Ignoring preset ${preset} in [${existingPresets.join(", ")}]`);
		return false;
	}
	return true;
}
//#endregion
export { getPreset, presetSources, replaceArgs, resolveConfigPresets };

//# sourceMappingURL=index.js.map