import { RegExpVersioningApi } from "../regex/index.js";
import { isEmptyArray, isNonEmptyArray, isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/modules/versioning/nixpkgs/index.ts
const id = "nixpkgs";
var NixPkgsVersioning = class NixPkgsVersioning extends RegExpVersioningApi {
	static versionRegex = "^(?<prefix>(nixos|nixpkgs|release))-((?<major>\\d{2})\\.(?<minor>\\d{2})|unstable)(-(?<suffix>(small|aarch64|darwin)))?$";
	constructor() {
		super(NixPkgsVersioning.versionRegex);
	}
	_parse(version) {
		const groups = this._config?.exec(version)?.groups;
		if (!groups) return null;
		const { prefix, major, minor, suffix } = groups;
		const release = [];
		if (major) release.push(Number.parseInt(major, 10));
		if (minor) release.push(Number.parseInt(minor, 10));
		return {
			release,
			compatibility: isNonEmptyStringAndNotWhitespace(suffix) ? `${prefix}-${suffix}` : prefix
		};
	}
	isStable(version) {
		const parsed = this._parse(version);
		return isNonEmptyArray(parsed?.release);
	}
	_compare(version, other) {
		const left = this._parse(version);
		const right = this._parse(other);
		if (isEmptyArray(left?.release) && isEmptyArray(right?.release)) return 0;
		if (isEmptyArray(left?.release)) return 1;
		if (isEmptyArray(right?.release)) return -1;
		return super._compare(version, other);
	}
};
const api = NixPkgsVersioning;
//#endregion
export { NixPkgsVersioning, api, api as default, id };

//# sourceMappingURL=index.js.map