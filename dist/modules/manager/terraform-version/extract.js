import { logger } from "../../../logger/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
//#region lib/modules/manager/terraform-version/extract.ts
function extractPackageFile(content) {
	logger.trace("terraform-version.extractPackageFile()");
	return { deps: [{
		depName: "hashicorp/terraform",
		currentValue: content.trim(),
		datasource: GithubReleasesDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map