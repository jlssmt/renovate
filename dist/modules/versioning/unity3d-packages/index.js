import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/unity3d-packages/index.ts
const id = "unity3d-packages";
const api = new class Unity3dPackagesVersioningApi extends GenericVersioningApi {
	static parsingRegex = regEx(/^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?:-?(?<label>.*))/);
	static unstableRegex = regEx(/^(?:exp.|pre.|preview.)/);
	_parse(version) {
		const matches = Unity3dPackagesVersioningApi.parsingRegex.exec(version);
		if (!matches?.groups) return null;
		const { major, minor, patch, label } = matches.groups;
		return {
			release: [
				parseInt(major, 10),
				parseInt(minor, 10),
				parseInt(patch, 10)
			],
			prerelease: !Unity3dPackagesVersioningApi.unstableRegex.test(label) ? void 0 : label
		};
	}
}();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map