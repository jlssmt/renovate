import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/semver/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
//#region lib/modules/manager/batect-wrapper/extract.ts
const VERSION_REGEX = regEx(/^\s+VERSION="(?<version>.*)"$/m);
function extractPackageFile(fileContent) {
	logger.trace("batect.extractPackageFile()");
	const match = VERSION_REGEX.exec(fileContent);
	if (match === null) return null;
	const dependency = {
		depName: "batect/batect",
		commitMessageTopic: "Batect",
		currentValue: match.groups.version,
		datasource: GithubReleasesDatasource.id,
		versioning: id
	};
	logger.trace(dependency, "Found Batect wrapper version");
	return { deps: [dependency] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map