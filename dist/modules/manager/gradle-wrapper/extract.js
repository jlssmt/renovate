import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/gradle/index.js";
import { GradleVersionDatasource } from "../../datasource/gradle-version/index.js";
import { extractGradleVersion } from "./utils.js";
//#region lib/modules/manager/gradle-wrapper/extract.ts
function extractPackageFile(fileContent) {
	logger.trace("gradle-wrapper.extractPackageFile()");
	const extractResult = extractGradleVersion(fileContent);
	if (extractResult) return { deps: [{
		depName: "gradle",
		currentValue: extractResult.version,
		replaceString: extractResult.url,
		datasource: GradleVersionDatasource.id,
		versioning: id
	}] };
	return null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map