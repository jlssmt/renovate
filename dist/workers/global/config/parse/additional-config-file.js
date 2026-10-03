import { logger } from "../../../../logger/index.js";
import { getParsedContent, migrateAndValidateConfig } from "./util.js";
import { isEmptyStringOrWhitespace, isNonEmptyObject, isNonEmptyString, isUndefined } from "@sindresorhus/is";
import fs from "fs-extra";
//#region lib/workers/global/config/parse/additional-config-file.ts
async function getConfig(env) {
	let config = {};
	const configFile = env.RENOVATE_ADDITIONAL_CONFIG_FILE;
	if (!configFile) {
		logger.debug("No additional config file found specified - skipping");
		return config;
	}
	if (!await fs.pathExists(configFile)) {
		logger.fatal({ configFile }, `Custom additional config file specified in RENOVATE_ADDITIONAL_CONFIG_FILE must exist`);
		process.exit(1);
	}
	logger.debug(`Checking for additional config file in ${configFile}`);
	try {
		config = await getParsedContent(configFile);
	} catch (err) {
		if (err instanceof SyntaxError || err instanceof TypeError) {
			logger.fatal({ err }, "Could not parse additional config file");
			process.exit(1);
		} else if (err instanceof ReferenceError) {
			logger.fatal({ err }, "Error parsing additional config file due to unresolved variable(s)");
			process.exit(1);
		} else if (err.message === "Unsupported file type") {
			logger.fatal(err.message);
			process.exit(1);
		} else {
			logger.debug({ err }, "Parse error");
			logger.fatal("Error parsing additional config file");
			process.exit(1);
		}
		logger.debug("Error reading or parsing additional config file - skipping");
	}
	if (isNonEmptyObject(config.processEnv)) {
		const exportedKeys = [];
		for (const [key, value] of Object.entries(config.processEnv)) {
			if (!isNonEmptyString(value)) {
				logger.error({ key }, "processEnv value is not a string.");
				continue;
			}
			exportedKeys.push(key);
			process.env[key] = value;
		}
		logger.debug({ keys: exportedKeys }, "processEnv keys were exported to env");
		delete config.processEnv;
	}
	return migrateAndValidateConfig(config, configFile);
}
async function deleteNonDefaultConfig(env, deleteConfigFile) {
	const configFile = env.RENOVATE_ADDITIONAL_CONFIG_FILE;
	if (isUndefined(configFile) || isEmptyStringOrWhitespace(configFile)) return;
	if (!deleteConfigFile) return;
	if (!await fs.pathExists(configFile)) return;
	try {
		await fs.remove(configFile);
		logger.trace({ path: configFile }, "Additional config file successfully deleted");
	} catch (err) {
		logger.warn({ err }, "Error deleting additional config file");
	}
}
//#endregion
export { deleteNonDefaultConfig, getConfig };

//# sourceMappingURL=additional-config-file.js.map