import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/tflint-plugin/util.ts
const keyValueExtractionRegex = regEx(/^\s*(?<key>[^\s]+)\s+=\s+"(?<value>[^"]+)"\s*$/);
function checkFileContainsPlugins(content) {
	return ["plugin "].some((check) => content.includes(check));
}
//#endregion
export { checkFileContainsPlugins, keyValueExtractionRegex };

//# sourceMappingURL=util.js.map