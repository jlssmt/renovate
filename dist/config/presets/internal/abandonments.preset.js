import abandonments_default from "../../../data/abandonments.js";
//#region lib/config/presets/internal/abandonments.preset.ts
function loadAbandonmentPresets() {
	const packageRules = [{
		abandonmentThreshold: "1 year",
		matchPackageNames: ["*"]
	}];
	for (const [datasource, datasourceAbandonments] of Object.entries(abandonments_default)) {
		if (datasource === "$schema") continue;
		for (const [packageName, threshold] of Object.entries(datasourceAbandonments)) {
			const abandonmentThreshold = threshold === "eternal" ? null : threshold;
			packageRules.push({
				abandonmentThreshold,
				matchDatasources: [datasource],
				matchPackageNames: [packageName]
			});
		}
	}
	return { recommended: {
		description: "Recommended configuration for abandoned packages, treating packages without a release for 1 year as abandoned, while taking into account community-sourced overrides.",
		packageRules
	} };
}
const presets = loadAbandonmentPresets();
//#endregion
export { presets };

//# sourceMappingURL=abandonments.preset.js.map