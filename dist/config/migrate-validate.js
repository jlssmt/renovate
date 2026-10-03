import { coerceArray } from "../util/array.js";
import { logger } from "../logger/index.js";
import { massageConfig } from "./massage.js";
import { migrateConfig } from "./migration.js";
import { validateConfig } from "./validation.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import { dequal } from "dequal";
//#region lib/config/migrate-validate.ts
async function migrateAndValidate(config, input) {
	logger.debug("migrateAndValidate()");
	try {
		const { isMigrated, migratedConfig } = migrateConfig(input);
		if (isMigrated) logger.debug({
			oldConfig: input,
			newConfig: migratedConfig
		}, "Config migration necessary");
		else logger.debug("No config migration necessary");
		const massagedConfig = massageConfig(migratedConfig);
		if (!dequal(input, massagedConfig)) logger.debug({ config: massagedConfig }, "Post-massage config");
		const { warnings, errors } = await validateConfig("repo", massagedConfig);
		/* v8 ignore if -- hard to test */
		if (isNonEmptyArray(warnings)) logger.warn({ warnings }, "Found renovate config warnings");
		if (isNonEmptyArray(errors)) logger.info({ errors }, "Found renovate config errors");
		massagedConfig.errors = coerceArray(config.errors).concat(errors);
		if (!config.repoIsOnboarded) massagedConfig.warnings = coerceArray(config.warnings).concat(warnings);
		return massagedConfig;
	} catch (err) {
		logger.debug({ config: input }, "migrateAndValidate error");
		throw err;
	}
}
//#endregion
export { migrateAndValidate };

//# sourceMappingURL=migrate-validate.js.map