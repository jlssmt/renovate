import { coerceObject } from "../util/object.js";
import { regEx } from "../util/regex.js";
import { logger } from "../logger/index.js";
import { clone } from "../util/clone.js";
import { getOptions } from "./options/index.js";
import { MigrationsService } from "./migrations/migrations-service.js";
import "./migrations/index.js";
import { mergeChildConfig } from "./utils.js";
import { isArray, isBoolean, isNonEmptyArray, isNonEmptyObject, isObject, isString } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/config/migration.ts
const options = getOptions();
function fixShortHours(input) {
	return input.replace(regEx(/(?<hours> \d?\d)(?<meridiem>(?:a|p)m)/g), "$<hours>:00$<meridiem>");
}
let optionTypes;
function migrateConfig(config, parentKey) {
	try {
		if (!optionTypes) {
			optionTypes = {};
			options.forEach((option) => {
				optionTypes[option.name] = option.type;
			});
		}
		const newConfig = MigrationsService.run(config, parentKey);
		const migratedConfig = clone(newConfig);
		for (const [key, val] of Object.entries(newConfig)) {
			if (isString(val) && val.includes("{{baseDir}}")) migratedConfig[key] = val.replace(regEx(/{{baseDir}}/g), "{{packageFileDir}}");
			else if (isString(val) && val.includes("{{lookupName}}")) migratedConfig[key] = val.replace(regEx(/{{lookupName}}/g), "{{packageName}}");
			else if (isString(val) && val.includes("{{depNameShort}}")) migratedConfig[key] = val.replace(regEx(/{{depNameShort}}/g), "{{depName}}");
			else if (isString(val) && val.startsWith("{{semanticPrefix}}")) migratedConfig[key] = val.replace("{{semanticPrefix}}", "{{#if semanticCommitType}}{{semanticCommitType}}{{#if semanticCommitScope}}({{semanticCommitScope}}){{/if}}: {{/if}}");
			else if (optionTypes[key] === "object" && isBoolean(val)) migratedConfig[key] = { enabled: val };
			else if (optionTypes[key] === "boolean") {
				if (val === "true") migratedConfig[key] = true;
				else if (val === "false") migratedConfig[key] = false;
			} else if (optionTypes[key] === "string" && isArray(val) && val.length === 1) migratedConfig[key] = String(val[0]);
			else if (isArray(val)) {
				// v8 ignore else -- TODO: add test #40625
				if (isArray(migratedConfig?.[key])) {
					const newArray = [];
					for (const item of migratedConfig[key]) if (isObject(item) && !isArray(item)) {
						const arrMigrate = migrateConfig(item);
						newArray.push(arrMigrate.migratedConfig);
					} else newArray.push(item);
					migratedConfig[key] = newArray;
				}
			} else if (isObject(val)) {
				const subMigrate = migrateConfig(migratedConfig[key], key);
				if (subMigrate.isMigrated) migratedConfig[key] = subMigrate.migratedConfig;
			}
			const migratedTemplates = {
				fromVersion: "currentVersion",
				newValueMajor: "newMajor",
				newValueMinor: "newMinor",
				newVersionMajor: "newMajor",
				newVersionMinor: "newMinor",
				toVersion: "newVersion"
			};
			if (isString(migratedConfig[key])) for (const [from, to] of Object.entries(migratedTemplates)) migratedConfig[key] = migratedConfig[key].replace(regEx(from, "g"), to);
		}
		for (const language of [
			"docker",
			"dotnet",
			"golang",
			"java",
			"js",
			"node",
			"php",
			"python",
			"ruby",
			"rust"
		]) if (isNonEmptyObject(migratedConfig[language])) {
			migratedConfig.packageRules ??= [];
			const currentContent = migratedConfig[language];
			const packageRule = {
				matchCategories: [language],
				...currentContent
			};
			migratedConfig.packageRules.unshift(packageRule);
			delete migratedConfig[language];
		}
		if (isNonEmptyArray(migratedConfig.packageRules)) {
			const existingRules = migratedConfig.packageRules;
			migratedConfig.packageRules = [];
			for (const packageRule of existingRules) if (isArray(packageRule.packageRules)) {
				logger.debug("Flattening nested packageRules");
				for (const subrule of packageRule.packageRules) {
					const combinedRule = mergeChildConfig(packageRule, subrule);
					delete combinedRule.packageRules;
					migratedConfig.packageRules.push(combinedRule);
				}
			} else migratedConfig.packageRules.push(packageRule);
		}
		if (isNonEmptyObject(migratedConfig["pip-compile"]) && isNonEmptyArray(migratedConfig["pip-compile"].managerFilePatterns)) migratedConfig["pip-compile"].managerFilePatterns = migratedConfig["pip-compile"].managerFilePatterns.map((filePattern) => {
			const pattern = filePattern;
			if (pattern.endsWith(".in")) return pattern.replace(regEx(/\.in$/), ".txt");
			if (pattern.endsWith(".in/")) return pattern.replace(regEx(/\.in\/$/), ".txt/");
			return pattern.replace(regEx(/\.in\$\/$/), ".txt$/");
		});
		if (isNonEmptyArray(migratedConfig.matchManagers) && migratedConfig.matchManagers.includes("gradle-lite")) {
			// v8 ignore else -- TODO: add test #40625
			if (!migratedConfig.matchManagers.includes("gradle")) migratedConfig.matchManagers.push("gradle");
			migratedConfig.matchManagers = migratedConfig.matchManagers.filter((manager) => manager !== "gradle-lite");
		}
		if (isNonEmptyObject(migratedConfig["gradle-lite"])) migratedConfig.gradle = mergeChildConfig(coerceObject(migratedConfig.gradle), migratedConfig["gradle-lite"]);
		delete migratedConfig["gradle-lite"];
		const isMigrated = !dequal(config, migratedConfig);
		if (isMigrated) return {
			isMigrated,
			migratedConfig: migrateConfig(migratedConfig).migratedConfig
		};
		return {
			isMigrated,
			migratedConfig
		};
	} catch (err) {
		logger.debug({
			config,
			err
		}, "migrateConfig() error");
		throw err;
	}
}
//#endregion
export { fixShortHours, migrateConfig };

//# sourceMappingURL=migration.js.map