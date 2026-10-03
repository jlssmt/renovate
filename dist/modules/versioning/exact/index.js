//#region lib/modules/versioning/exact/index.ts
const id = "exact";
var ExactVersioningApi = class {
	isValid(version) {
		return version.length > 0;
	}
	isVersion(version) {
		return !!version && version.length > 0;
	}
	isSingleVersion(version) {
		return this.isValid(version);
	}
	isStable(_version) {
		return true;
	}
	isCompatible(version, current) {
		return version === current;
	}
	getMajor(_version) {
		return null;
	}
	getMinor(_version) {
		return null;
	}
	getPatch(_version) {
		return null;
	}
	equals(version, other) {
		return version === other;
	}
	isGreaterThan(_version, _other) {
		return false;
	}
	getSatisfyingVersion(versions, range) {
		return versions.find((v) => this.equals(v, range)) ?? null;
	}
	minSatisfyingVersion(versions, range) {
		return versions.find((v) => this.equals(v, range)) ?? null;
	}
	getNewValue({ currentValue }) {
		return currentValue;
	}
	sortVersions(_version, _other) {
		return 0;
	}
	matches(version, range) {
		return version === range;
	}
};
const api = new ExactVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map