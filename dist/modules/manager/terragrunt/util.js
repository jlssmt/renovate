import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/terragrunt/util.ts
const keyValueExtractionRegex = regEx(/^\s*source\s+=\s+"(?<value>[^"]+)"/);
function getTerragruntDependencyType(value) {
	switch (value) {
		case "terraform": return "terraform";
		default: return "unknown";
	}
}
function checkFileContainsDependency(content, checkList) {
	return checkList.some((check) => content.includes(check));
}
//#endregion
export { checkFileContainsDependency, getTerragruntDependencyType, keyValueExtractionRegex };

//# sourceMappingURL=util.js.map