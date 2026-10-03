import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getOciChartDep, isOCIRegistry } from "../helmv3/oci.js";
import { isNonEmptyString, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/helmsman/extract.ts
const chartRegex = regEx("^(?<registryRef>[^/]*)/(?<packageName>[^/]*)$");
function createDep(key, doc, registryAliases) {
	const dep = {
		depName: key,
		datasource: HelmDatasource.id
	};
	const anApp = doc.apps[key];
	if (!anApp) return null;
	if (!anApp.version) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	dep.currentValue = anApp.version;
	if (anApp.chart && isOCIRegistry(anApp.chart)) return {
		...dep,
		...getOciChartDep(anApp.chart, void 0, registryAliases)
	};
	const regexResult = anApp.chart ? chartRegex.exec(anApp.chart) : null;
	if (!regexResult?.groups) {
		dep.skipReason = "invalid-url";
		return dep;
	}
	if (!isNonEmptyString(regexResult.groups.packageName)) {
		dep.skipReason = "invalid-name";
		return dep;
	}
	dep.packageName = regexResult.groups.packageName;
	const registryUrl = doc.helmRepos[regexResult.groups.registryRef];
	if (!isNonEmptyString(registryUrl)) {
		dep.skipReason = "no-repository";
		return dep;
	}
	dep.registryUrls = [registryUrl];
	return dep;
}
function extractPackageFile(content, packageFile, config) {
	try {
		const doc = parseSingleYaml(content);
		if (!doc.apps) {
			logger.debug({ packageFile }, `Missing apps keys`);
			return null;
		}
		const deps = Object.keys(doc.apps).map((key) => createDep(key, doc, config.registryAliases)).filter(isTruthy);
		if (deps.length === 0) return null;
		return { deps };
	} catch (err) /* istanbul ignore next */ {
		if (err.stack?.startsWith("YAMLException:")) logger.debug({
			err,
			packageFile
		}, "YAML exception extracting");
		else logger.debug({
			err,
			packageFile
		}, "Error extracting");
		return null;
	}
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map