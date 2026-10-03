import { coerceObject } from "../../../util/object.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getDep } from "../dockerfile/extract.js";
//#region lib/modules/manager/velaci/extract.ts
function extractPackageFile(file, packageFile) {
	let doc;
	try {
		doc = parseSingleYaml(file);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Failed to parse Vela file.");
		return null;
	}
	const deps = [];
	for (const step of coerceArray(doc.steps)) {
		const dep = getDep(step.image);
		deps.push(dep);
	}
	for (const service of coerceArray(doc.services)) {
		const dep = getDep(service.image);
		deps.push(dep);
	}
	for (const stage of Object.values(coerceObject(doc.stages))) for (const step of coerceArray(stage.steps)) {
		const dep = getDep(step.image);
		deps.push(dep);
	}
	for (const secret of Object.values(coerceObject(doc.secrets))) if (secret.origin) {
		const dep = getDep(secret.origin.image);
		deps.push(dep);
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map