import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { withDebugMessage } from "../../../util/schema-utils/index.js";
import { id } from "../../versioning/kubernetes-api/index.js";
import { KubernetesApiDatasource, supportedApis } from "../../datasource/kubernetes-api/index.js";
import { getDep } from "../dockerfile/extract.js";
import { KubernetesManifests } from "./schema.js";
//#region lib/modules/manager/kubernetes/extract.ts
function extractPackageFile(content, packageFile, config) {
	logger.trace("kubernetes.extractPackageFile()");
	if (!(regEx(/\s*apiVersion\s*:/).test(content) && regEx(/\s*kind\s*:/).test(content))) return null;
	const manifests = KubernetesManifests.catch(withDebugMessage([], `${packageFile} does not match Kubernetes schema`)).parse(content);
	const deps = [
		...extractImages(content, config),
		...extractImageVolumes(manifests, config),
		...extractApis(manifests)
	];
	return deps.length ? { deps } : null;
}
const k8sImageRegex = regEx(`^\\s*-?\\s*image:\\s*['"]?(((?:(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(?:\\.(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))*|\\[(?:[a-fA-F0-9:]+)\\])(?::[0-9]+)?/)?[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*(?:/[a-z0-9]+(?:(?:[._]|__|[-]+)[a-z0-9]+)*)*)(?::([A-Za-z0-9_][A-Za-z0-9_.-]{0,127}))?(?:@([A-Za-z][A-Za-z0-9]*(?:[-_+.][A-Za-z][A-Za-z0-9]*)*[:][0-9a-fA-F]{32,}))?)['"]?\\s*`);
function extractImages(content, config) {
	const deps = [];
	for (const line of content.split(newlineRegex)) {
		const match = k8sImageRegex.exec(line);
		if (match) {
			const currentFrom = match[1];
			const dep = getDep(currentFrom, true, config.registryAliases);
			logger.debug({
				depName: dep.depName,
				currentValue: dep.currentValue,
				currentDigest: dep.currentDigest
			}, "Kubernetes image");
			deps.push(dep);
		}
	}
	return deps;
}
function extractImageVolumes(manifests, config) {
	const deps = [];
	for (const manifest of manifests) for (const currentFrom of manifest.imageVolumeReferences) {
		const dep = getDep(currentFrom, true, config.registryAliases);
		logger.debug({
			depName: dep.depName,
			currentValue: dep.currentValue,
			currentDigest: dep.currentDigest
		}, "Kubernetes image volume");
		deps.push(dep);
	}
	return deps;
}
function extractApis(manifests) {
	return manifests.filter((m) => supportedApis.has(m.kind)).map((configuration) => ({
		depName: configuration.kind,
		currentValue: configuration.apiVersion,
		datasource: KubernetesApiDatasource.id,
		versioning: id
	}));
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map