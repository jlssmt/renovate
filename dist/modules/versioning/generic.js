import { regEx } from "../../util/regex.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/versioning/generic.ts
var GenericVersioningApi = class {
	_getSection(version, index) {
		const parsed = this._parse(version);
		return parsed && parsed.release.length > index ? parsed.release[index] : null;
	}
	_compare(version, other) {
		const left = this._parse(version);
		const right = this._parse(other);
		// istanbul ignore if
		if (!(left && right)) return 1;
		const length = Math.max(left.release.length, right.release.length);
		for (let i = 0; i < length; i += 1) {
			const part1 = left.release[i] ?? 0;
			const part2 = right.release[i] ?? 0;
			if (part1 !== part2) return part1 - part2;
		}
		if (isNonEmptyString(left.prerelease) && isNonEmptyString(right.prerelease)) {
			const pre = left.prerelease.localeCompare(right.prerelease, void 0, { numeric: true });
			if (pre !== 0) return pre;
		} else if (isNonEmptyString(left.prerelease)) return -1;
		else if (isNonEmptyString(right.prerelease)) return 1;
		return this._compareOther(left, right);
	}
	_compareOther(_left, _right) {
		return 0;
	}
	isValid(version) {
		return this._parse(version) !== null;
	}
	isCompatible(version, _current) {
		return this.isValid(version);
	}
	isStable(version) {
		const parsed = this._parse(version);
		return !!(parsed && !parsed.prerelease);
	}
	isSingleVersion(version) {
		return this.isValid(version);
	}
	isVersion(version) {
		return this.isValid(version);
	}
	getMajor(version) {
		return this._getSection(version, 0);
	}
	getMinor(version) {
		return this._getSection(version, 1);
	}
	getPatch(version) {
		return this._getSection(version, 2);
	}
	equals(version, other) {
		return this._compare(version, other) === 0;
	}
	isGreaterThan(version, other) {
		return this._compare(version, other) > 0;
	}
	isLessThanRange(version, range) {
		return this._compare(version, range) < 0;
	}
	getSatisfyingVersion(versions, range) {
		return versions.find((v) => this.equals(v, range)) ?? null;
	}
	minSatisfyingVersion(versions, range) {
		return versions.find((v) => this.equals(v, range)) ?? null;
	}
	getNewValue({ currentValue, currentVersion, newVersion }) {
		if (currentVersion === `v${currentValue}`) return newVersion.replace(regEx(/^v/), "");
		return newVersion ?? null;
	}
	sortVersions(version, other) {
		return this._compare(version, other);
	}
	matches(version, range) {
		return this.equals(version, range);
	}
	isSame(type, a, b) {
		if (type === "major") return this.getMajor(a) === this.getMajor(b);
		if (type === "minor") return this.getMinor(a) === this.getMinor(b);
		return this.getPatch(a) === this.getPatch(b);
	}
};
//#endregion
export { GenericVersioningApi };

//# sourceMappingURL=generic.js.map