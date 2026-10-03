import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/flux/common.ts
const systemManifestFileNameRegex = "(?:^|/)gotk-components\\.ya?ml$";
const systemManifestHeaderRegex = "#\\s*Flux\\s+Version:\\s*(\\S+)(?:\\s*#\\s*Components:\\s*([A-Za-z,-]+))?";
function isSystemManifest(file) {
	return regEx(systemManifestFileNameRegex).test(file);
}
function collectHelmRepos(manifests) {
	const helmRepositories = [];
	for (const manifest of manifests) if (manifest.kind === "resource") {
		for (const resource of manifest.resources) if (resource.kind === "HelmRepository") helmRepositories.push(resource);
	}
	return helmRepositories;
}
//#endregion
export { collectHelmRepos, isSystemManifest, systemManifestFileNameRegex, systemManifestHeaderRegex };

//# sourceMappingURL=common.js.map