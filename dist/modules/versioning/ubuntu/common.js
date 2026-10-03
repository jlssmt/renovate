import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/ubuntu/common.ts
const regex = regEx(/^(?<codename>\w+)-(?<date>\d{8})(?<suffix>\.\d{1,2})?$/);
function isDatedCodeName(input) {
	return regex.test(input);
}
function getDatedContainerImageCodename(version) {
	const groups = regex.exec(version);
	if (!groups?.groups) return null;
	return groups.groups.codename;
}
function getDatedContainerImageVersion(version) {
	const groups = regex.exec(version);
	if (!groups?.groups) return null;
	return parseInt(groups.groups.date, 10);
}
function getDatedContainerImageSuffix(version) {
	const groups = regex.exec(version);
	if (!groups?.groups?.suffix) return null;
	return groups.groups.suffix;
}
//#endregion
export { getDatedContainerImageCodename, getDatedContainerImageSuffix, getDatedContainerImageVersion, isDatedCodeName };

//# sourceMappingURL=common.js.map