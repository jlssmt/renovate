#!/usr/bin/env node
import { require_punycode } from "./punycode.js";
import { pkg } from "./expose.js";
import { getEnv } from "./util/env.js";
import { regEx, regexEngineStatus } from "./util/regex.js";
import { getConfigFileNames } from "./config/app-strings.js";
import { GlobalConfig } from "./config/global.js";
import { init, logger } from "./logger/index.js";
import { massageConfig } from "./config/massage.js";
import { migrateConfig } from "./config/migration.js";
import { add } from "./util/host-rules.js";
import { validateConfig } from "./config/validation.js";
import { getParsedContent } from "./workers/global/config/parse/util.js";
import { getConfig } from "./workers/global/config/parse/file.js";
import { parseConfigs } from "./workers/global/config/parse/index.js";
import "source-map-support/register.js";
import { styleText } from "node:util";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { Command, CommanderError } from "commander";
import { dequal } from "dequal";
import { diffLines } from "diff";
import fs from "fs-extra";
require_punycode();
await init();
const { pathExists, readFile } = fs;
let returnVal = 0;
/**
* Make sure that we've resolved configuration from the different places that Renovate users would expect them to be specified
*
* This then allows a `configType=repo` config to i.e. be validated alongside a `config.js` or `env RENOVATE_ALLOWED_COMMANDS=...`
*
* Note that we intentionally don't fully initialize Renovate and its modules, as we're not fully running, and it would require a Platform to be configured
* */
async function partiallyGlobalInitialize() {
	const globalConfig = await parseConfigs(getEnv(), []);
	GlobalConfig.set(globalConfig);
	if (globalConfig.hostRules) for (const hostRule of globalConfig.hostRules) add(hostRule);
}
async function validate(configType, desc, config, strict, isPreset = false) {
	if (config.hostRules) {
		const allowedHeaders = configType === "global" ? config.allowedHeaders ?? GlobalConfig.get("allowedHeaders") : GlobalConfig.get("allowedHeaders");
		for (const hostRule of config.hostRules) add(hostRule, { allowedHeaders });
	}
	const { isMigrated, migratedConfig } = migrateConfig(config);
	if (isMigrated) {
		logger.warn({
			oldConfig: config,
			newConfig: migratedConfig
		}, "Config migration necessary");
		const changedObjects = diffLines(JSON.stringify(config, null, 2), JSON.stringify(migratedConfig, null, 2), {
			ignoreWhitespace: false,
			newlineIsToken: false
		});
		const added = styleText("green", "+ ");
		const removed = styleText("red", "- ");
		const msg = changedObjects.flatMap((part) => {
			let linePrefix;
			if (part.added) linePrefix = added;
			else if (part.removed) linePrefix = removed;
			else linePrefix = "  ";
			return part.value.split("\n").filter(isNonEmptyStringAndNotWhitespace).map((line) => line.replace(regEx(/^(?<ws> *)/), `${linePrefix}$<ws>`));
		}).join("\n");
		logger.warn(`Config migration diff:\n${msg}`);
		if (strict) returnVal = 1;
	}
	const massagedConfig = massageConfig(migratedConfig);
	const res = await validateConfig(configType, massagedConfig, isPreset);
	if (res.errors.length) {
		logger.error({
			file: desc,
			errors: res.errors
		}, "Found errors in configuration");
		returnVal = 1;
	}
	if (res.warnings.length) {
		logger.warn({
			file: desc,
			warnings: res.warnings
		}, "Found errors in configuration");
		returnVal = 1;
	}
}
(async () => {
	await partiallyGlobalInitialize();
	const program = new Command("renovate-config-validator").summary("Validate Renovate configuration files").description("Validate your Renovate configuration (repo config, shared presets or global configuration) files\nIf no [config-files...] are given, renovate-config-validator will look at the default config file locations (https://docs.renovatebot.com/configuration-options/)").addHelpText("after", `
When specifying [config-files...], Renovate will treat them as global self-hosted configuration files. You can disable this behaviour with --no-global

Examples:

  $ renovate-config-validator
  $ renovate-config-validator --strict
  $ renovate-config-validator first_config.json
  $ renovate-config-validator --strict config.js
  $ renovate-config-validator --no-global renovate.json5
  $ env RENOVATE_CONFIG_FILE=obscure-name.json renovate-config-validator

Global configuration:

If you have specified global self-hosted configuration (https://docs.renovatebot.com/self-hosted-configuration/) in environment variables or in a \`config.js\`, this will be detected:

  $ env RENOVATE_ALLOWED_ENV='["GO*"]' renovate-config-validator
  # if passing the filename, make sure it's not validating as a global config
  $ env RENOVATE_ALLOWED_ENV='["GO*"]' renovate-config-validator --no-global renovate.json`).argument("[config-files...]").version(pkg.version, "-v, --version").option("--strict", "Fail command if any configuration warnings, errors, or a migration is needed").option("--no-global", "When specifying [config-files], do not treat them as global self-hosted configuration file(s)", true).exitOverride();
	program.action(async (files, opts) => {
		const strict = opts.strict ?? false;
		let filesValidated = 0;
		if (regexEngineStatus.type === "unavailable") logger.warn({ err: regexEngineStatus.err }, "RE2 not usable, falling back to RegExp: regex validation may be inaccurate");
		else if (regexEngineStatus.type === "ignored") logger.debug("RE2 ignored via RENOVATE_X_IGNORE_RE2: regex validation may be inaccurate");
		if (files.length) {
			let isGlobalConfig = true;
			if (opts.global === false) isGlobalConfig = false;
			const configType = isGlobalConfig ? "global" : "repo";
			for (const file of files) {
				try {
					if (!await pathExists(file)) {
						returnVal = 1;
						logger.error({ file }, "File does not exist");
						break;
					}
					const parsedContent = await getParsedContent(file);
					try {
						logger.info(`Validating ${file} as ${configType} config`);
						await validate(configType, file, parsedContent, strict);
					} catch (err) {
						logger.warn({
							file,
							err
						}, "File is not valid Renovate config");
						returnVal = 1;
					}
				} catch (err) {
					logger.warn({
						file,
						err
					}, "File could not be parsed");
					returnVal = 1;
				}
				filesValidated++;
			}
		} else {
			for (const file of getConfigFileNames().filter((name) => name !== "package.json")) {
				try {
					if (!await pathExists(file)) continue;
					const parsedContent = await getParsedContent(file);
					try {
						logger.info(`Validating ${file}`);
						await validate("repo", file, parsedContent, strict);
					} catch (err) {
						logger.warn({
							file,
							err
						}, "File is not valid Renovate config");
						returnVal = 1;
					}
				} catch (err) {
					logger.warn({
						file,
						err
					}, "File could not be parsed");
					returnVal = 1;
				}
				filesValidated++;
			}
			try {
				const pkgJson = JSON.parse(await readFile("package.json", "utf8"));
				if (pkgJson.renovate) {
					logger.info(`Validating package.json > renovate`);
					await validate("repo", "package.json > renovate", pkgJson.renovate, strict);
					filesValidated++;
				}
				if (pkgJson["renovate-config"]) {
					logger.info(`Validating package.json > renovate-config`);
					for (const presetConfig of Object.values(pkgJson["renovate-config"])) {
						await validate("repo", "package.json > renovate-config", presetConfig, strict, true);
						filesValidated++;
					}
				}
			} catch {}
			try {
				const env = getEnv();
				const fileConfig = await getConfig(env);
				if (!dequal(fileConfig, {})) {
					const file = env.RENOVATE_CONFIG_FILE ?? "config.js";
					logger.info(`Validating ${file}`);
					try {
						await validate("global", file, fileConfig, strict);
					} catch (err) {
						logger.error({
							file,
							err
						}, "File is not valid Renovate config");
						returnVal = 1;
					}
					filesValidated++;
				}
			} catch {}
		}
		if (returnVal === 0 && filesValidated) logger.info(`Config validated successfully against ${filesValidated} file(s)`);
		else if (!filesValidated) logger.warn(`No files to perform configuration validation against`);
		process.exitCode = returnVal;
	});
	await program.parseAsync();
})().catch((e) => {
	if (e instanceof CommanderError && (e.code === "commander.helpDisplayed" || e.code === "commander.version")) return;
	console.error(e);
	process.exit(99);
});
//#endregion
export {};

//# sourceMappingURL=config-validator.js.map