import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { isArray, isNullOrUndefined, isString } from "@sindresorhus/is";
import JSON5 from "json5";
import { coerce, satisfies } from "semver";
//#region lib/modules/manager/osgi/extract.ts
function extractPackageFile(content, packageFile, _config) {
	logger.trace(`osgi.extractPackageFile($packageFile)`);
	const deps = [];
	let featureModel;
	try {
		featureModel = JSON5.parse(content);
	} catch (err) {
		logger.warn({
			packageFile,
			err
		}, "Failed to parse osgi file");
		return null;
	}
	if (isNullOrUndefined(featureModel) || !isSupportedFeatureResourceVersion(featureModel, packageFile)) return null;
	const allBundles = coerceArray(featureModel.bundles);
	const execEnvFramework = featureModel["execution-environment:JSON|false"]?.framework;
	if (!isNullOrUndefined(execEnvFramework)) allBundles.push(execEnvFramework);
	for (const [section, value] of Object.entries(featureModel)) {
		logger.trace({
			fileName: packageFile,
			section
		}, "Parsing section");
		const customSectionEntries = extractArtifactList(section, value);
		allBundles.push(...customSectionEntries);
	}
	for (const entry of allBundles) {
		const rawGav = isString(entry) ? entry : entry.id;
		if (!rawGav) continue;
		const gav = rawGav.replace(regEx(/\//g), ":");
		const parts = gav.split(":");
		if (parts.length < 3 || parts.length > 5) {
			deps.push({
				depName: gav,
				skipReason: "invalid-value"
			});
			continue;
		}
		const currentValue = parts.at(-1);
		const result = {
			datasource: MavenDatasource.id,
			depName: `${parts[0]}:${parts[1]}`
		};
		if (currentValue.includes("${")) result.skipReason = "contains-variable";
		else result.currentValue = currentValue;
		deps.push(result);
	}
	return deps.length ? { deps } : null;
}
function isSupportedFeatureResourceVersion(featureModel, fileName) {
	const resourceVersion = featureModel["feature-resource-version"];
	if (resourceVersion) {
		const resourceSemVer = coerce(resourceVersion);
		if (!resourceSemVer) {
			logger.debug(`Skipping file ${fileName} due to invalid feature-resource-version '${resourceVersion}'`);
			return false;
		}
		if (!satisfies(resourceSemVer, "^1")) {
			logger.debug(`Skipping file ${fileName} due to unsupported feature-resource-version '${resourceVersion}'`);
			return false;
		}
	}
	return true;
}
function extractArtifactList(sectionName, sectionValue) {
	if (sectionName.includes(":ARTIFACTS|") && isArray(sectionValue)) return sectionValue;
	return [];
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map