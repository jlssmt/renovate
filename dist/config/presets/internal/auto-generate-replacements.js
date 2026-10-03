import { coerceArray } from "../../../util/array.js";
//#region lib/config/presets/internal/auto-generate-replacements.ts
function generatePackageRules(replacementRules) {
	const rules = [];
	for (const replacementRule of replacementRules) {
		const { matchCurrentVersion, matchDatasources, replacements, replacementVersion } = replacementRule;
		for (const replacement of replacements) {
			const [matchPackageNames, replacementName] = replacement;
			rules.push({
				matchCurrentVersion,
				matchDatasources,
				matchPackageNames,
				replacementName,
				replacementVersion
			});
		}
	}
	return rules;
}
function addPresets(presets, ...templates) {
	const ext = coerceArray(presets.all?.extends);
	for (const template of templates) {
		const { title, description, packageRules } = template;
		presets[title] = {
			description,
			packageRules: generatePackageRules(packageRules)
		};
		ext.push(`replacements:${title}`);
	}
	ext.sort();
}
//#endregion
export { addPresets };

//# sourceMappingURL=auto-generate-replacements.js.map