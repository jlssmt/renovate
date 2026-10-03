import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/unity3d/index.ts
const id = "unity3d";
const api = new class Unity3dVersioningApi extends GenericVersioningApi {
	static parsingRegex = regEx(/^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<releaseStream>\w)(?<build>\d+)/);
	static ReleaseStreamType = [
		"a",
		"b",
		"p",
		"x",
		"f",
		"c"
	];
	static stableVersions = ["f", "c"];
	_parse(version) {
		const matches = Unity3dVersioningApi.parsingRegex.exec(version);
		if (!matches?.groups) return null;
		const { major, minor, patch, releaseStream, build } = matches.groups;
		return {
			release: [
				parseInt(major, 10),
				parseInt(minor, 10),
				parseInt(patch, 10),
				Unity3dVersioningApi.ReleaseStreamType.indexOf(releaseStream),
				parseInt(build, 10)
			],
			prerelease: Unity3dVersioningApi.stableVersions.includes(releaseStream) ? void 0 : build
		};
	}
}();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map