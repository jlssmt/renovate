import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getSiblingFileName, localPathExists } from "../../../util/fs/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { parseRepository, resolveAlias } from "./utils.js";
import { isNonEmptyArray, isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/helmv3/extract.ts
async function extractPackageFile(content, packageFile, config) {
	let chart;
	try {
		chart = parseSingleYaml(content);
		if (!(chart?.apiVersion && chart.name && chart.version)) {
			logger.debug({ packageFile }, "Failed to find required fields in Chart.yaml");
			return null;
		}
		if (chart.apiVersion !== "v2") {
			logger.debug({ packageFile }, "Unsupported Chart apiVersion. Only v2 is supported.");
			return null;
		}
	} catch {
		logger.debug({ packageFile }, `Failed to parse helm Chart.yaml`);
		return null;
	}
	const packageFileVersion = chart.version;
	let deps = [];
	if (!isNonEmptyArray(chart?.dependencies)) {
		logger.debug(`Chart has no dependencies in ${packageFile}`);
		return null;
	}
	const validDependencies = chart.dependencies.filter((dep) => isNonEmptyString(dep.name) && isNonEmptyString(dep.version));
	if (!isNonEmptyArray(validDependencies)) {
		logger.debug("Name and/or version missing for all dependencies");
		return null;
	}
	deps = validDependencies.map((dep) => {
		const res = {
			depName: dep.name,
			currentValue: dep.version
		};
		if (!dep.repository) {
			res.skipReason = "no-repository";
			return res;
		}
		if (dep.repository.startsWith("git+")) {
			logger.debug({
				repository: dep.repository,
				packageFile
			}, `Skipping unsupported helm-git repository.`);
			res.skipReason = "unknown-registry";
			return res;
		}
		const repository = resolveAlias(dep.repository, config.registryAliases);
		if (!repository) {
			res.skipReason = "placeholder-url";
			return res;
		}
		return {
			...res,
			...parseRepository(dep.name, repository, config.registryAliases)
		};
	});
	const res = {
		deps,
		datasource: HelmDatasource.id,
		packageFileVersion
	};
	const lockFileName = getSiblingFileName(packageFile, "Chart.lock");
	// istanbul ignore if
	if (await localPathExists(lockFileName)) res.lockFiles = [lockFileName];
	return res;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map