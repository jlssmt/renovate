//#region lib/config/presets/internal/merge-confidence.preset.ts
const supportedDatasources = [
	"go",
	"maven",
	"npm",
	"nuget",
	"packagist",
	"pypi",
	"rubygems"
];
const presets = {
	"age-confidence-badges": {
		description: "Show only the Age and Confidence Merge Confidence badges for pull requests.",
		packageRules: [{
			matchDatasources: supportedDatasources,
			matchUpdateTypes: [
				"patch",
				"minor",
				"major"
			],
			prBodyColumns: [
				"Package",
				"Change",
				"Age",
				"Confidence"
			]
		}]
	},
	"all-badges": {
		description: "Show all Merge Confidence badges for pull requests.",
		packageRules: [{
			matchDatasources: supportedDatasources,
			matchUpdateTypes: [
				"patch",
				"minor",
				"major"
			],
			prBodyColumns: [
				"Package",
				"Change",
				"Age",
				"Adoption",
				"Passing",
				"Confidence"
			]
		}]
	}
};
//#endregion
export { presets, supportedDatasources };

//# sourceMappingURL=merge-confidence.preset.js.map