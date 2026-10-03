import { logger } from "../../../logger/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
//#region lib/modules/manager/terragrunt-version/extract.ts
function extractPackageFile(content) {
	logger.trace("terragrunt-version.extractPackageFile()");
	return { deps: [{
		depName: "gruntwork-io/terragrunt",
		currentValue: content.trim(),
		datasource: GithubReleasesDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map