//#region lib/config/inherit.ts
const NOT_PRESENT = Symbol("not-present");
var InheritConfig = class InheritConfig {
	static OPTIONS = [
		"bbUseDevelopmentBranch",
		"configFileNames",
		"onboarding",
		"onboardingAutoCloseAge",
		"onboardingBranch",
		"onboardingCommitMessage",
		"onboardingConfig",
		"onboardingConfigFileName",
		"onboardingNoDeps",
		"onboardingPrTitle",
		"requireConfig"
	];
	static config = {};
	static get(key) {
		if (key in InheritConfig.config) return InheritConfig.config[key];
		return NOT_PRESENT;
	}
	static set(config) {
		InheritConfig.reset();
		const result = { ...config };
		for (const option of InheritConfig.OPTIONS) {
			if (option in config) InheritConfig.config[option] = config[option];
			delete result[option];
		}
		return result;
	}
	static reset() {
		InheritConfig.config = {};
	}
};
//#endregion
export { InheritConfig, NOT_PRESENT };

//# sourceMappingURL=inherit.js.map