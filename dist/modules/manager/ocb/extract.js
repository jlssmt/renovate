import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { OCBConfig } from "./schema.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/ocb/extract.ts
function extractPackageFile(content, packageFile, _config) {
	let definition = null;
	try {
		const yaml = parseSingleYaml(content);
		const parsed = OCBConfig.safeParse(yaml);
		if (!parsed.success) {
			logger.trace({
				packageFile,
				err: parsed.error
			}, "Failed to parse OCB schema");
			return null;
		}
		definition = parsed.data;
	} catch (error) {
		logger.debug({
			packageFile,
			err: error
		}, "OCB manager failed to parse file as YAML");
		return null;
	}
	const deps = [];
	// v8 ignore else -- needs a builder definition whose dist omits the version
	if (definition.dist.otelcol_version) deps.push({
		datasource: GoDatasource.id,
		depType: "collector",
		depName: "go.opentelemetry.io/collector",
		currentValue: definition.dist.otelcol_version,
		extractVersion: "^v(?<version>\\S+)"
	});
	deps.push(...processModule(definition.connectors, "connectors"));
	deps.push(...processModule(definition.exporters, "exports"));
	deps.push(...processModule(definition.extensions, "extensions"));
	deps.push(...processModule(definition.processors, "processors"));
	deps.push(...processModule(definition.providers, "providers"));
	deps.push(...processModule(definition.receivers, "receivers"));
	return {
		packageFileVersion: definition.dist.version,
		deps
	};
}
function processModule(module, depType) {
	const deps = [];
	if (isNullOrUndefined(module)) return deps;
	for (const element of module) {
		const [depName, currentValue] = element.gomod.trim().split(regEx(/\s+/));
		deps.push({
			datasource: GoDatasource.id,
			depType,
			depName,
			currentValue
		});
	}
	return deps;
}
//#endregion
export { extractPackageFile, processModule };

//# sourceMappingURL=extract.js.map