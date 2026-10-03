import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getDep } from "../dockerfile/extract.js";
import { QuadletFile } from "./schema.js";
//#region lib/modules/manager/quadlet/extract.ts
function startsWithAny(image, prefixes) {
	return !!prefixes.find((prefix) => image.startsWith(prefix));
}
function endsWithAny(image, suffixes) {
	return !!suffixes.find((suffix) => image.endsWith(suffix));
}
function getQuadletImage(image, ignoredSuffixes, deps, config) {
	if (image && !startsWithAny(image, [
		"dir:",
		"docker-archive:",
		"oci-archive:",
		"oci:",
		"containers-storage:",
		"sif:"
	]) && !endsWithAny(image, ignoredSuffixes)) {
		const cleanedImage = image.replace(regEx(/^docker:\/\//), "").replace(regEx(/^docker-daemon:/), "");
		const dep = getDep(cleanedImage, true, config.registryAliases);
		dep.depType = "image";
		deps.push(dep);
	}
}
function extractPackageFile(content, packageFile, config) {
	const deps = [];
	const res = QuadletFile.safeParse(content);
	if (!res.success) {
		logger.debug({
			err: res.error,
			packageFile
		}, "Error parsing Quadlet file.");
		return null;
	}
	const quadletFile = res.data;
	getQuadletImage(quadletFile?.Container?.Image, [".image", ".build"], deps, config);
	getQuadletImage(quadletFile?.Image?.Image, [], deps, config);
	getQuadletImage(quadletFile?.Volume?.Image, [".image"], deps, config);
	if (deps.length) return { deps };
	return null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map