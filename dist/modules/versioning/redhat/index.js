import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/modules/versioning/redhat/index.ts
const id = "redhat";
const pattern = regEx(/^v?(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?(?:\.GA)?(?:-(?<releaseMajor>\d+)(?:\.(?<releaseMinor>\d+))?)?$/);
var RedhatVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		const matches = pattern.exec(version)?.groups;
		if (!matches) return null;
		const { major, minor, patch, releaseMajor, releaseMinor } = matches;
		return {
			release: [
				Number.parseInt(major, 10),
				isUndefined(minor) ? 0 : Number.parseInt(minor, 10),
				isUndefined(patch) ? 0 : Number.parseInt(patch, 10),
				isUndefined(releaseMajor) ? 0 : Number.parseInt(releaseMajor, 10),
				isUndefined(releaseMinor) ? 0 : Number.parseInt(releaseMinor, 10)
			],
			prerelease: ""
		};
	}
};
const api = new RedhatVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map