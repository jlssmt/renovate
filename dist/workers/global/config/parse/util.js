import { logger } from "../../../../logger/index.js";
import { massageConfig } from "../../../../config/massage.js";
import { migrateConfig } from "../../../../config/migration.js";
import { parseJson } from "../../../../util/common.js";
import { parseSingleYaml } from "../../../../util/yaml.js";
import { validateConfig } from "../../../../config/validation.js";
import { readSystemFile } from "../../../../util/fs/index.js";
import { createRequire } from "node:module";
import { isFunction } from "@sindresorhus/is";
import { dequal } from "dequal";
import upath from "upath";
import { pathToFileURL } from "node:url";
//#region lib/workers/global/config/parse/util.ts
async function migrateAndValidateConfig(config, configType) {
	const { isMigrated, migratedConfig } = migrateConfig(config);
	if (isMigrated) logger.warn({
		configType,
		originalConfig: config,
		migratedConfig
	}, "Config needs migrating");
	const massagedConfig = massageConfig(migratedConfig);
	if (!dequal(migratedConfig, massagedConfig)) logger.trace({ config: massagedConfig }, "Post-massage config");
	const { warnings, errors } = await validateConfig("global", massagedConfig);
	if (warnings.length) logger.warn({
		configType,
		warnings
	}, "Config validation warnings found");
	if (errors.length) logger.warn({
		configType,
		errors
	}, "Config validation errors found");
	return massagedConfig;
}
async function getParsedContent(file) {
	if (upath.basename(file) === ".renovaterc") return parseJson(await readSystemFile(file, "utf8"), file);
	switch (upath.extname(file)) {
		case ".yaml":
		case ".yml": return parseSingleYaml(await readSystemFile(file, "utf8"));
		case ".json5":
		case ".json":
		case ".jsonc": return parseJson(await readSystemFile(file, "utf8"), file);
		case ".cts":
		case ".mts":
		case ".ts":
		case ".cjs":
		case ".mjs":
		case ".js": {
			const absoluteFilePath = upath.isAbsolute(file) ? file : `${process.cwd()}/${file}`;
			const fileUrl = pathToFileURL(absoluteFilePath).href;
			let tmpConfig;
			try {
				tmpConfig = await import(fileUrl);
			} catch (err) {
				/* v8 ignore start -- CJS fallback not testable in vitest */
				if ([".js", ".ts"].includes(upath.extname(file))) {
					const require = createRequire(import.meta.url);
					try {
						tmpConfig = require(absoluteFilePath);
					} catch {
						throw err;
					}
				} else throw err;
			}
			/* v8 ignore next -- not testable */
			let config = tmpConfig.default ?? tmpConfig;
			if (isFunction(config)) config = config();
			return config;
		}
		default: throw new Error("Unsupported file type");
	}
}
//#endregion
export { getParsedContent, migrateAndValidateConfig };

//# sourceMappingURL=util.js.map