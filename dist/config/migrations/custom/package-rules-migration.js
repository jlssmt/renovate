import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isNonEmptyArray, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/package-rules-migration.ts
const renameMap = {
	matchFiles: "matchFileNames",
	matchPaths: "matchFileNames",
	paths: "matchFileNames",
	languages: "matchCategories",
	matchLanguages: "matchCategories",
	baseBranchList: "matchBaseBranches",
	managers: "matchManagers",
	datasources: "matchDatasources",
	depTypeList: "matchDepTypes",
	packageNames: "matchPackageNames",
	packagePatterns: "matchPackagePatterns",
	sourceUrlPrefixes: "matchSourceUrlPrefixes",
	updateTypes: "matchUpdateTypes"
};
function renameKeys(packageRule) {
	const newPackageRule = {};
	for (const [key, val] of Object.entries(packageRule)) newPackageRule[renameMap[key] ?? key] = val;
	return newPackageRule;
}
function mergeMatchers(packageRule) {
	const newPackageRule = { ...packageRule };
	for (const [key, val] of Object.entries(packageRule)) {
		const patterns = isString(val) ? [val] : val;
		if (key === "matchDepPrefixes") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchDepNames ??= [];
				newPackageRule.matchDepNames.push(...patterns.map((v) => `${v}{/,}**`));
			}
			delete newPackageRule.matchDepPrefixes;
		}
		if (key === "matchDepPatterns") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchDepNames ??= [];
				newPackageRule.matchDepNames.push(...patterns.map((v) => `/${v}/`));
			}
			delete newPackageRule.matchDepPatterns;
		}
		if (key === "excludeDepNames") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchDepNames ??= [];
				newPackageRule.matchDepNames.push(...patterns.map((v) => `!${v}`));
			}
			delete newPackageRule.excludeDepNames;
		}
		if (key === "excludeDepPrefixes") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchDepNames ??= [];
				newPackageRule.matchDepNames.push(...patterns.map((v) => `!${v}{/,}**`));
			}
			delete newPackageRule.excludeDepPrefixes;
		}
		if (key === "excludeDepPatterns") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchDepNames ??= [];
				newPackageRule.matchDepNames.push(...patterns.map((v) => `!/${v}/`));
			}
			delete newPackageRule.excludeDepPatterns;
		}
		if (key === "matchPackagePrefixes") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchPackageNames ??= [];
				newPackageRule.matchPackageNames.push(...patterns.map((v) => `${v}{/,}**`));
			}
			delete newPackageRule.matchPackagePrefixes;
		}
		if (key === "matchPackagePatterns") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchPackageNames ??= [];
				newPackageRule.matchPackageNames.push(...patterns.map((v) => {
					if (v === "*") return "*";
					return `/${v}/`;
				}));
			}
			delete newPackageRule.matchPackagePatterns;
		}
		if (key === "excludePackageNames") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchPackageNames ??= [];
				newPackageRule.matchPackageNames.push(...patterns.map((v) => `!${v}`));
			}
			delete newPackageRule.excludePackageNames;
		}
		if (key === "excludePackagePrefixes") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchPackageNames ??= [];
				newPackageRule.matchPackageNames.push(...patterns.map((v) => `!${v}{/,}**`));
			}
			delete newPackageRule.excludePackagePrefixes;
		}
		if (key === "excludePackagePatterns") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchPackageNames ??= [];
				newPackageRule.matchPackageNames.push(...patterns.map((v) => `!/${v}/`));
			}
			delete newPackageRule.excludePackagePatterns;
		}
		if (key === "matchSourceUrlPrefixes") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchSourceUrls ??= [];
				newPackageRule.matchSourceUrls.push(...patterns.map((v) => `${v}{/,}**`));
			}
			delete newPackageRule.matchSourceUrlPrefixes;
		}
		if (key === "excludeRepositories") {
			// v8 ignore else -- TODO: add test #40625
			if (isArray(patterns, isString)) {
				newPackageRule.matchRepositories ??= [];
				newPackageRule.matchRepositories.push(...patterns.map((v) => `!${v}`));
			}
			delete newPackageRule.excludeRepositories;
		}
	}
	return newPackageRule;
}
var PackageRulesMigration = class extends AbstractMigration {
	propertyName = "packageRules";
	run(value) {
		let packageRules = this.get("packageRules");
		// v8 ignore else -- TODO: add test #40625
		if (isNonEmptyArray(packageRules)) {
			packageRules = packageRules.map(renameKeys);
			packageRules = packageRules.map(mergeMatchers);
			this.rewrite(packageRules);
		}
	}
};
//#endregion
export { PackageRulesMigration, renameMap };

//# sourceMappingURL=package-rules-migration.js.map