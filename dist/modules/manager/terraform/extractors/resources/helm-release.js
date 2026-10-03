import { logger } from "../../../../../logger/index.js";
import { HelmDatasource } from "../../../../datasource/helm/index.js";
import { getOciChartDep, isOCIRegistry, removeOCIPrefix } from "../../../helmv3/oci.js";
import { isLocalChartPath } from "../../../helmv3/utils.js";
import { DependencyExtractor } from "../../base.js";
import { isNonEmptyString, isNullOrUndefined, isPlainObject } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/resources/helm-release.ts
var HelmReleaseExtractor = class extends DependencyExtractor {
	getCheckList() {
		return [`"helm_release"`];
	}
	extract(hclMap, _locks, config) {
		const dependencies = [];
		const helmReleases = hclMap?.resource?.helm_release;
		if (isNullOrUndefined(helmReleases)) return [];
		/* v8 ignore next -- needs test */
		if (!isPlainObject(helmReleases)) {
			logger.debug({ helmReleases }, "Terraform: unexpected `helmReleases` value");
			return [];
		}
		for (const helmRelease of Object.values(helmReleases).flat()) {
			const dep = {
				currentValue: helmRelease.version,
				depType: "helm_release",
				depName: helmRelease.chart,
				datasource: HelmDatasource.id
			};
			dependencies.push(dep);
			if (!isNonEmptyString(helmRelease.chart)) dep.skipReason = "invalid-name";
			else if (isOCIRegistry(helmRelease.chart)) {
				dep.depName = removeOCIPrefix(helmRelease.chart);
				Object.assign(dep, getOciChartDep(helmRelease.chart, void 0, config.registryAliases));
			} else if (isLocalChartPath(helmRelease.chart)) dep.skipReason = "local-chart";
			else if (isNonEmptyString(helmRelease.repository)) {
				if (isOCIRegistry(helmRelease.repository)) Object.assign(dep, getOciChartDep(helmRelease.repository, helmRelease.chart, config.registryAliases));
				else dep.registryUrls = [helmRelease.repository];
			}
		}
		return dependencies;
	}
};
//#endregion
export { HelmReleaseExtractor };

//# sourceMappingURL=helm-release.js.map