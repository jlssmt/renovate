import { trimTrailingSlash } from "../../../util/url.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { getDep } from "../dockerfile/extract.js";
import { isNullOrUndefined, isString } from "@sindresorhus/is";
//#region lib/modules/manager/helmv3/oci.ts
function isOCIRegistry(repository) {
	if (isNullOrUndefined(repository)) return false;
	return (isString(repository) ? repository : repository.repository).startsWith("oci://");
}
function removeOCIPrefix(repository) {
	if (isOCIRegistry(repository)) return repository.replace("oci://", "");
	return repository;
}
/**
* Resolves a Helm chart stored in an OCI registry to the `docker` datasource.
*
* @param repository OCI registry or repository URL, with or without the `oci://` prefix
* @param chart chart name appended to `repository`, omit when `repository` already points to the chart
* @param registryAliases resolved the same way as for container image references
* @returns `datasource`, `packageName` and `pinDigests`. Callers set `depName`, `currentValue` and `depType`.
*/
function getOciChartDep(repository, chart, registryAliases) {
	const image = trimTrailingSlash(removeOCIPrefix(repository));
	const { packageName, skipReason } = getDep(chart ? `${image}/${chart}` : image, false, registryAliases);
	return {
		datasource: DockerDatasource.id,
		packageName,
		...skipReason && { skipReason },
		pinDigests: false
	};
}
//#endregion
export { getOciChartDep, isOCIRegistry, removeOCIPrefix };

//# sourceMappingURL=oci.js.map