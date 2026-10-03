import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/docker/index.ts
const id = "docker";
const versionPattern = regEx(/^(?<version>\d+(?:\.\d+)*)(?<prerelease>\w*)$/);
const commitHashPattern = regEx(/^[a-f0-9]{7,40}$/);
const numericPattern = regEx(/^[0-9]+$/);
var DockerVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		if (!version) return null;
		if (commitHashPattern.test(version) && !numericPattern.test(version)) return null;
		const [prefix, ...suffixPieces] = version.replace(regEx(/^v/), "").split("-");
		const matchGroups = prefix?.match(versionPattern)?.groups;
		if (!matchGroups) return null;
		const { version: ver, prerelease } = matchGroups;
		return {
			release: ver.split(".").map(Number),
			suffix: suffixPieces.join("-"),
			prerelease
		};
	}
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		// istanbul ignore if
		if (!(parsed1 && parsed2)) return 1;
		const length = Math.max(parsed1.release.length, parsed2.release.length);
		for (let i = 0; i < length; i += 1) {
			const part1 = parsed1.release[i];
			const part2 = parsed2.release[i];
			if (part1 === void 0) return 1;
			if (part2 === void 0) return -1;
			if (part1 !== part2) return part1 - part2;
		}
		if (parsed1.prerelease !== parsed2.prerelease) {
			if (!parsed1.prerelease && parsed2.prerelease) return 1;
			if (parsed1.prerelease && !parsed2.prerelease) return -1;
			return coerceString(parsed1.prerelease).localeCompare(coerceString(parsed2.prerelease));
		}
		const suffix1 = coerceString(parsed1.suffix);
		return coerceString(parsed2.suffix).localeCompare(suffix1);
	}
	isCompatible(version, current) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(current);
		return !!(parsed1 && parsed2 && parsed1.suffix === parsed2.suffix && parsed1.release.length === parsed2.release.length);
	}
	valueToVersion(value) {
		return value ? value.split("-")[0] : value;
	}
};
const api = new DockerVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map