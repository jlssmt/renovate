import { coerceArray } from "../../../util/array.js";
import { parseYaml } from "../../../util/yaml.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getOciChartDep, isOCIRegistry } from "../helmv3/oci.js";
import { ProfileDefinition } from "./schema.js";
import { removeRepositoryName } from "./util.js";
//#region lib/modules/manager/sveltos/extract.ts
function extractPackageFile(content, packageFile, config) {
	const definitions = parseYaml(content, {
		customSchema: ProfileDefinition,
		failureBehaviour: "filter"
	});
	const deps = [];
	for (const definition of definitions) {
		const extractedDeps = extractDefinition(definition, config);
		deps.push(...extractedDeps);
	}
	return deps.length ? { deps } : null;
}
function extractDefinition(definition, config) {
	return processAppSpec(definition, config);
}
function processHelmCharts(source, registryAliases) {
	const dep = {
		depName: source.chartName,
		currentValue: source.chartVersion
	};
	if (isOCIRegistry(source.repositoryURL)) return {
		...dep,
		...getOciChartDep(source.repositoryURL, source.chartName, registryAliases)
	};
	return {
		...dep,
		packageName: removeRepositoryName(source.repositoryName, source.chartName),
		registryUrls: [source.repositoryURL],
		datasource: HelmDatasource.id
	};
}
function processAppSpec(definition, config) {
	const deps = [];
	const depType = definition.kind;
	const helmCharts = definition.kind === "ClusterPromotion" ? definition.spec?.profileSpec?.helmCharts : definition.spec?.helmCharts;
	for (const source of coerceArray(helmCharts)) {
		const dep = processHelmCharts(source, config?.registryAliases);
		dep.depType = depType;
		deps.push(dep);
	}
	return deps;
}
//#endregion
export { extractDefinition, extractPackageFile };

//# sourceMappingURL=extract.js.map