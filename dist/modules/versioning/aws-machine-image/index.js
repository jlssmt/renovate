import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/aws-machine-image/index.ts
const id = "aws-machine-image";
const awsMachineImageRegex = regEx("^ami-(?<suffix>[a-z0-9]{17})$");
var AwsMachineImageVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		if (version) {
			const matchGroups = awsMachineImageRegex.exec(version)?.groups;
			if (matchGroups) {
				const { suffix } = matchGroups;
				return {
					release: [
						1,
						0,
						0
					],
					suffix
				};
			}
		}
		return null;
	}
	_compare(_version, _other) {
		return 1;
	}
};
const api = new AwsMachineImageVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map