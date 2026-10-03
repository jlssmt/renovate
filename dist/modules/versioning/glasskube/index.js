import { GenericVersioningApi } from "../generic.js";
import { SemVer } from "semver";
//#region lib/modules/versioning/glasskube/index.ts
const id = "glasskube";
var GlasskubeVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		let parsedVersion;
		try {
			parsedVersion = new SemVer(version);
		} catch {
			return null;
		}
		const result = {
			release: [
				parsedVersion.major,
				parsedVersion.minor,
				parsedVersion.patch
			],
			prerelease: parsedVersion.prerelease.length > 0 ? parsedVersion.prerelease.join(".") : void 0
		};
		const build = parsedVersion.build.at(0);
		if (build) try {
			result.release.push(parseInt(build, 10));
		} catch {}
		return result;
	}
};
const api = new GlasskubeVersioningApi();
//#endregion
export { GlasskubeVersioningApi, api, api as default, id };

//# sourceMappingURL=index.js.map