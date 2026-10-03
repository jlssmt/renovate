import { mergeRenovateConfig } from "./merge.js";
import { mergeInheritedConfig } from "./inherited.js";
import { checkOnboardingBranch } from "../onboarding/branch/index.js";
//#region lib/workers/repository/init/config.ts
// istanbul ignore next
async function getRepoConfig(config_) {
	let config = { ...config_ };
	config.baseBranch = config.defaultBranch;
	config = await mergeInheritedConfig(config);
	config = await checkOnboardingBranch(config);
	config = await mergeRenovateConfig(config);
	return config;
}
//#endregion
export { getRepoConfig };

//# sourceMappingURL=config.js.map