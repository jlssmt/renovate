import { get, set } from "../../../util/cache/memory/index.js";
import { getConfigFileNames } from "../../../config/app-strings.js";
import { logger } from "../../../logger/index.js";
import { getInheritedOrGlobal } from "../../../util/common.js";
//#region lib/workers/repository/onboarding/common.ts
function getSemanticCommitPrTitle(config) {
	return `${config.semanticCommitType ?? "chore"}: ${getInheritedOrGlobal("onboardingPrTitle")}`;
}
function getDefaultConfigFileName() {
	const configFileNames = getConfigFileNames();
	const onboardingConfigFileName = getInheritedOrGlobal("onboardingConfigFileName");
	return configFileNames.includes(onboardingConfigFileName) ? onboardingConfigFileName : configFileNames[0];
}
var OnboardingState = class OnboardingState {
	static cacheKey = "OnboardingState";
	static skipKey = "OnboardingStateValid";
	static get prUpdateRequested() {
		const updateRequested = !!get(OnboardingState.cacheKey);
		logger.trace({ value: updateRequested }, "Get OnboardingState.prUpdateRequested");
		return updateRequested;
	}
	static set prUpdateRequested(value) {
		logger.trace({ value }, "Set OnboardingState.prUpdateRequested");
		set(OnboardingState.cacheKey, value);
	}
	static get onboardingCacheValid() {
		const cacheValid = !!get(OnboardingState.skipKey);
		logger.trace({ value: cacheValid }, "Get OnboardingState.onboardingCacheValid");
		return cacheValid;
	}
	static set onboardingCacheValid(value) {
		logger.trace({ value }, "Set OnboardingState.onboardingCacheValid");
		set(OnboardingState.skipKey, value);
	}
};
//#endregion
export { OnboardingState, getDefaultConfigFileName, getSemanticCommitPrTitle };

//# sourceMappingURL=common.js.map