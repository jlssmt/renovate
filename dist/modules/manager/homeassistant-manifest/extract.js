import { logger } from "../../../logger/index.js";
import { HomeAssistantManifest } from "./schema.js";
//#region lib/modules/manager/homeassistant-manifest/extract.ts
function extractPackageFile(content, packageFile) {
	const result = HomeAssistantManifest.safeParse(content);
	if (!result.success) {
		if (result.error.issues.some((i) => i.message === "Invalid JSON")) logger.debug({
			packageFile,
			err: result.error
		}, "Failed to parse manifest.json");
		else logger.debug({
			packageFile,
			err: result.error
		}, "Not a Home Assistant manifest");
		return null;
	}
	const deps = result.data;
	if (!deps || deps.length === 0) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map