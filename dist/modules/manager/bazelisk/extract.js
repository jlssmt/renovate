import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
//#region lib/modules/manager/bazelisk/extract.ts
function extractPackageFile(content) {
	return { deps: [{
		depName: "bazel",
		currentValue: content.split("\n", 2)[0].trim(),
		datasource: GithubReleasesDatasource.id,
		packageName: "bazelbuild/bazel"
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map