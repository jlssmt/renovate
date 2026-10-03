import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { trimTrailingSlash } from "../../../util/url.js";
import { withDebugMessage } from "../../../util/schema-utils/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getDep } from "../dockerfile/extract.js";
import { getOciChartDep, isOCIRegistry, removeOCIPrefix } from "../helmv3/oci.js";
import { ApplicationDefinitions } from "./schema.js";
import { fileTestRegex } from "./util.js";
import { isNonEmptyObject, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/argocd/extract.ts
const kustomizeImageRe = regEx(/=(?<image>.+)$/);
function extractPackageFile(content, packageFile, config) {
	if (fileTestRegex.test(content) === false) {
		logger.debug(`Skip file ${packageFile} as no argoproj.io apiVersion could be found in matched file`);
		return null;
	}
	const deps = ApplicationDefinitions.catch(withDebugMessage([], `${packageFile} does not match schema`)).parse(content).flatMap((definition) => processAppSpec(definition, config?.registryAliases));
	return deps.length ? { deps } : null;
}
function processSource(source, registryAliases) {
	if (source.chart) {
		if (isOCIRegistry(source.repoURL) || !source.repoURL.includes("://")) {
			const registryURL = trimTrailingSlash(removeOCIPrefix(source.repoURL));
			return [{
				...getOciChartDep(source.repoURL, source.chart, registryAliases),
				depName: `${registryURL}/${source.chart}`,
				currentValue: source.targetRevision
			}];
		}
		return [{
			depName: source.chart,
			registryUrls: [source.repoURL],
			currentValue: source.targetRevision,
			datasource: HelmDatasource.id
		}];
	}
	if (isOCIRegistry(source.repoURL)) return [{
		...getOciChartDep(source.repoURL, void 0, registryAliases),
		depName: trimTrailingSlash(removeOCIPrefix(source.repoURL)),
		currentValue: source.targetRevision
	}];
	const dependencies = [{
		depName: source.repoURL,
		currentValue: source.targetRevision,
		datasource: GitTagsDatasource.id
	}];
	if (source.kustomize?.images) dependencies.push(...source.kustomize.images.map(processKustomizeImage).filter(isTruthy));
	return dependencies;
}
function processAppSpec(definition, registryAliases) {
	const spec = definition.kind === "Application" ? definition.spec : definition.spec.template.spec;
	const deps = [];
	if (isNonEmptyObject(spec.source)) deps.push(...processSource(spec.source, registryAliases));
	for (const source of coerceArray(spec.sources)) deps.push(...processSource(source, registryAliases));
	return deps;
}
function processKustomizeImage(kustomizeImage) {
	const parts = kustomizeImageRe.exec(kustomizeImage);
	if (!parts?.groups?.image) return null;
	return getDep(parts.groups.image);
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map