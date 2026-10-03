import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { clone } from "../../../../util/clone.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import "../../../../config/presets/util.js";
import { getPreset } from "../../../../config/presets/local/index.js";
import { EditorConfig } from "../../../../util/json-writer/editor-config.js";
import { JSONWriter } from "../../../../util/json-writer/json-writer.js";
import "../../../../util/json-writer/index.js";
//#region lib/workers/repository/onboarding/branch/config.ts
async function getOnboardingConfig(config) {
	let onboardingConfig = clone(getInheritedOrGlobal("onboardingConfig"));
	const foundPreset = await searchDefaultOnboardingPreset(config.repository);
	if (foundPreset) {
		logger.debug(`Found preset ${foundPreset} - using it in onboarding config`);
		onboardingConfig = {
			$schema: "https://docs.renovatebot.com/renovate-schema.json",
			extends: [foundPreset]
		};
	} else logger.debug("No default org/owner preset found, so the default onboarding config will be used instead.");
	logger.debug({ config: onboardingConfig }, "onboarding config");
	return onboardingConfig;
}
async function searchDefaultOnboardingPreset(repository) {
	let foundPreset;
	logger.debug("Checking for a default Renovate preset which can be used.");
	const repoPathParts = repository.split("/");
	for (let index = repoPathParts.length - 1; index >= 1 && !foundPreset; index--) {
		const groupName = repoPathParts.slice(0, index).join("/");
		try {
			const repo = `${groupName}/renovate-config`;
			const preset = `local>${repo}`;
			logger.debug(`Checking for preset: ${preset}`);
			if (await getPreset({ repo })) foundPreset = preset;
		} catch (err) {
			if (err.message !== "dep not found" && !err.message.startsWith("Unsupported platform")) logger.warn({ err }, "Unknown error fetching default owner preset");
		}
	}
	if (!foundPreset) {
		const orgName = repoPathParts[0];
		const platform = GlobalConfig.get("platform");
		try {
			const repo = `${orgName}/.${platform}`;
			const presetName = "renovate-config";
			const orgPresetName = `local>${repo}:${presetName}`;
			logger.debug(`Checking for preset: ${orgPresetName}`);
			if (await getPreset({
				repo,
				presetName
			})) foundPreset = orgPresetName;
		} catch (err) {
			if (err.message !== "dep not found" && !err.message.startsWith("Unsupported platform")) logger.warn({ err }, "Unknown error fetching default owner preset");
		}
	}
	return foundPreset;
}
async function getOnboardingConfigContents(config, fileName) {
	const codeFormat = await EditorConfig.getCodeFormat(fileName);
	const jsonWriter = new JSONWriter(codeFormat);
	const onboardingConfig = await getOnboardingConfig(config);
	return jsonWriter.write(onboardingConfig);
}
//#endregion
export { getOnboardingConfig, getOnboardingConfigContents };

//# sourceMappingURL=config.js.map