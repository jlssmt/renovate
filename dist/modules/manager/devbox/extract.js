import { logger, withMeta } from "../../../logger/index.js";
import { Devbox } from "./schema.js";
//#region lib/modules/manager/devbox/extract.ts
function extractPackageFile(content, packageFile) {
	logger.trace("devbox.extractPackageFile()");
	const deps = withMeta({ packageFile }, () => Devbox.parse(content));
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map