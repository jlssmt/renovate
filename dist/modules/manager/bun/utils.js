import { regEx } from "../../../util/regex.js";
import { minimatch } from "../../../util/minimatch.js";
import upath from "upath";
//#region lib/modules/manager/bun/utils.ts
function fileMatchesWorkspaces(pwd, fileName, workspaces) {
	if (!fileName.startsWith(pwd)) return false;
	const relativeFile = upath.relative(pwd, fileName).replace(regEx(/\/package\.json$/), "");
	return workspaces.some((pattern) => minimatch(pattern, { dot: true }).match(relativeFile));
}
function filesMatchingWorkspaces(pwd, files, workspaces) {
	return files.filter((file) => fileMatchesWorkspaces(pwd, file, workspaces));
}
//#endregion
export { fileMatchesWorkspaces, filesMatchingWorkspaces };

//# sourceMappingURL=utils.js.map