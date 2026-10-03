import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/sveltos/util.ts
function removeRepositoryName(repositoryName, chartName) {
	const repoNameWithSlash = regEx(`^${repositoryName}/`, void 0, false);
	let modifiedChartName = chartName.replace(repoNameWithSlash, "");
	modifiedChartName = modifiedChartName.replace(regEx(/\/+$/), "");
	return modifiedChartName;
}
//#endregion
export { removeRepositoryName };

//# sourceMappingURL=util.js.map