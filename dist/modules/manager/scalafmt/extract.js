import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/semver/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
//#region lib/modules/manager/scalafmt/extract.ts
const scalafmtVersionRegex = regEx("version *= *\"?(?<version>\\d+\\.\\d+\\.\\d+)\"?");
function extractPackageFile(content) {
	const scalafmtVersion = scalafmtVersionRegex.exec(content)?.groups?.version;
	if (!scalafmtVersion) return null;
	return { deps: [{
		datasource: GithubReleasesDatasource.id,
		depName: "scalafmt",
		packageName: "scalameta/scalafmt",
		versioning: id,
		currentValue: scalafmtVersion,
		extractVersion: "^v(?<version>\\S+)"
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map