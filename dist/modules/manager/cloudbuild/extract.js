import { logger } from "../../../logger/index.js";
import { getDep } from "../dockerfile/extract.js";
import { CloudbuildSteps } from "./schema.js";
//#region lib/modules/manager/cloudbuild/extract.ts
function extractPackageFile(content, packageFile) {
	const deps = CloudbuildSteps.catch(({ error: err }) => {
		logger.debug({
			err,
			packageFile
		}, "Cloud Build: error extracting Docker images from a configuration file.");
		return [];
	}).transform((steps) => steps.map((step) => getDep(step))).parse(content);
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map