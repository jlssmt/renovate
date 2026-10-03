import { regEx } from "../../../util/regex.js";
import { GenericVersioningApi } from "../generic.js";
//#region lib/modules/versioning/devbox/index.ts
const id = "devbox";
const validPattern = regEx(/^(?:(?:\d|[1-9]\d*)(?:\.(?:\d|[1-9]\d*)){0,2})$/);
const versionPattern = regEx(/^(?:(?:\d|[1-9]\d*)(?:\.(?:\d|[1-9]\d*)){2})$/);
var DevboxVersioningApi = class extends GenericVersioningApi {
	_parse(version) {
		const matches = validPattern.exec(version);
		if (!matches) return null;
		return { release: matches[0].split(".").map(Number) };
	}
	isValid(version) {
		if (version === "latest") return true;
		return this._parse(version) !== null;
	}
	isVersion(version) {
		if (version === "latest") return false;
		return !!versionPattern.exec(version);
	}
	matches(version, range) {
		return this.isVersion(version) && this.equals(version, range);
	}
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		if (other === "latest" && parsed1) return 0;
		if (!(parsed1 && parsed2)) return 1;
		const length = Math.max(parsed1.release.length, parsed2.release.length);
		for (let i = 0; i < length; i += 1) {
			const part1 = parsed1.release[i];
			const part2 = parsed2.release[i];
			if (part1 !== void 0 && part2 !== void 0 && part1 !== part2) return part1 - part2;
		}
		return 0;
	}
};
const api = new DevboxVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map