import { regEx } from "../../../util/regex.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/modules/manager/nvm/extract.ts
function extractPackageFile(content) {
	return { deps: [{
		depName: "node",
		currentValue: content.split("\n").map((line) => line.replace(regEx(/#.*$/), "").trim()).filter(isNonEmptyStringAndNotWhitespace).join("\n").trim(),
		datasource: NodeVersionDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map