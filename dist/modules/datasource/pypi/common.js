import { regEx } from "../../../util/regex.js";
//#region lib/modules/datasource/pypi/common.ts
const pypiDatasourceId = "pypi";
const githubRepoPattern = regEx(/^https?:\/\/github\.com\/(?<owner>[^/]+)\/[^/]+$/);
function isGitHubRepo(url) {
	const m = url.match(githubRepoPattern);
	return !!m && m.groups.owner !== "sponsors";
}
function normalizePythonDepName(name) {
	return name.replace(regEx(/[-_.]+/g), "-").toLowerCase();
}
//#endregion
export { isGitHubRepo, normalizePythonDepName, pypiDatasourceId };

//# sourceMappingURL=common.js.map