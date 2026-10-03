import { coerceObject } from "../../../util/object.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { getToolConfig } from "../../../util/exec/containerbase.js";
import { isToolName } from "../../../util/exec/types.js";
import { parsePreset } from "../../../config/presets/parse.js";
import { GiteaTagsDatasource } from "../../datasource/gitea-tags/index.js";
import { ForgejoTagsDatasource } from "../../datasource/forgejo-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { RenovateJson } from "./schema.js";
import { isNonEmptyArray, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/renovate-config/extract.ts
const supportedPresetSources = {
	github: GithubTagsDatasource.id,
	gitlab: GitlabTagsDatasource.id,
	gitea: GiteaTagsDatasource.id,
	forgejo: ForgejoTagsDatasource.id
};
function extractPackageFile(content, packageFile) {
	logger.trace(`renovate-config.extractPackageFile(${packageFile})`);
	const config = RenovateJson.safeParse(content);
	if (!config.success) {
		logger.debug({
			packageFile,
			err: config.error
		}, "Invalid Renovate Config");
		return null;
	}
	const deps = [];
	for (const preset of coerceArray(config.data.extends)) {
		if (preset.includes("{{")) continue;
		let parsedPreset;
		try {
			parsedPreset = parsePreset(preset);
		} catch (err) {
			logger.debug({
				preset,
				err
			}, "Failed to parse preset");
			deps.push({
				depName: preset,
				skipReason: "invalid-value"
			});
			continue;
		}
		const datasource = supportedPresetSources[parsedPreset.presetSource];
		if (isNullOrUndefined(datasource)) {
			if (parsedPreset.presetSource !== "internal") deps.push({
				depName: parsedPreset.presetSource === "relative" ? preset : parsedPreset.repo,
				skipReason: "unsupported-datasource"
			});
			continue;
		}
		if (isNullOrUndefined(parsedPreset.tag)) {
			deps.push({
				depName: parsedPreset.repo,
				skipReason: "unspecified-version"
			});
			continue;
		}
		deps.push({
			depName: parsedPreset.repo,
			datasource,
			currentValue: parsedPreset.tag
		});
	}
	for (const [constraint, value] of Object.entries(coerceObject(config.data.constraints))) if (isToolName(constraint)) {
		const toolConfig = getToolConfig(constraint);
		deps.push({
			...toolConfig,
			depName: constraint,
			currentValue: value,
			depType: "tool-constraint",
			commitMessageTopic: "{{{depName}}} tool constraint"
		});
	} else deps.push({
		depName: constraint,
		currentValue: value,
		skipReason: "unsupported",
		depType: "constraint",
		commitMessageTopic: "{{{depName}}} constraint"
	});
	for (const packageRule of coerceArray(config.data.packageRules)) for (const [constraint, value] of Object.entries(coerceObject(packageRule.constraints))) if (isToolName(constraint)) {
		const toolConfig = getToolConfig(constraint);
		deps.push({
			...toolConfig,
			depName: constraint,
			currentValue: value,
			depType: "tool-constraint",
			commitMessageTopic: "{{{depName}}} tool constraint"
		});
	} else deps.push({
		depName: constraint,
		currentValue: value,
		skipReason: "unsupported",
		depType: "constraint",
		commitMessageTopic: "{{{depName}}} constraint"
	});
	return isNonEmptyArray(deps) ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map