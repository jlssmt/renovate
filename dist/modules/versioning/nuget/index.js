import { parseRange, parseVersion } from "./parser.js";
import { compare, versionToString } from "./version.js";
import { coerceFloatingComponent, getFloatingRangeLowerBound, matches, rangeToString, tryBump } from "./range.js";
//#region lib/modules/versioning/nuget/index.ts
const id = "nuget";
var NugetVersioningApi = class {
	isCompatible(version, _current) {
		return this.isValid(version);
	}
	isSingleVersion(version) {
		const r = parseRange(version);
		if (!r) return false;
		return r.type === "nuget-exact-range";
	}
	isStable(version) {
		const v = parseVersion(version);
		if (v) return !v.prerelease;
		const r = parseRange(version);
		if (r?.type !== "nuget-exact-range") return false;
		return !r.version.prerelease;
	}
	isValid(input) {
		if (parseVersion(input)) return true;
		if (parseRange(input)) return true;
		return false;
	}
	isVersion(input) {
		if (!input) return false;
		if (!parseVersion(input)) return false;
		return true;
	}
	getMajor(version) {
		const v = parseVersion(version);
		if (!v) return null;
		return v.major;
	}
	getMinor(version) {
		const v = parseVersion(version);
		if (!v) return null;
		return v.minor ?? null;
	}
	getPatch(version) {
		const v = parseVersion(version);
		if (!v) return null;
		return v.patch ?? null;
	}
	equals(version, other) {
		const x = parseVersion(version);
		const y = parseVersion(other);
		if (!x || !y) return false;
		return compare(x, y) === 0;
	}
	isGreaterThan(version, other) {
		const x = parseVersion(version);
		const y = parseVersion(other);
		if (!x || !y) return false;
		return compare(x, y) > 0;
	}
	isLessThanRange(version, range) {
		const v = parseVersion(version);
		if (!v) return false;
		const u = parseVersion(range);
		if (u) return compare(v, u) < 0;
		const r = parseRange(range);
		if (!r) return false;
		if (r.type === "nuget-exact-range") return compare(v, r.version) < 0;
		if (r.type === "nuget-bracket-range") {
			if (!r.min) return false;
			const minBound = r.min.type === "nuget-version" ? r.min : getFloatingRangeLowerBound(r.min);
			const cmp = compare(v, minBound);
			return r.minInclusive ? cmp < 0 : cmp <= 0;
		}
		const minBound = getFloatingRangeLowerBound(r);
		return compare(v, minBound) < 0;
	}
	getSatisfyingVersion(versions, range) {
		const r = parseRange(range);
		if (r) {
			let result = null;
			let vMax;
			for (const version of versions) {
				const v = parseVersion(version);
				if (!v) continue;
				if (!matches(v, r)) continue;
				if (!vMax || compare(v, vMax) > 0) {
					vMax = v;
					result = version;
				}
			}
			return result;
		}
		const u = parseVersion(range);
		if (u) {
			let result = null;
			let vMax;
			for (const version of versions) {
				const v = parseVersion(version);
				if (!v) continue;
				if (v.prerelease && !u.prerelease) continue;
				if (compare(v, u) < 0) continue;
				if (!vMax || compare(v, vMax) > 0) {
					vMax = v;
					result = version;
				}
			}
			return result;
		}
		return null;
	}
	minSatisfyingVersion(versions, range) {
		const r = parseRange(range);
		if (r) {
			let result = null;
			let vMin;
			for (const version of versions) {
				const v = parseVersion(version);
				if (!v) continue;
				if (!matches(v, r)) continue;
				if (!vMin || compare(v, vMin) < 0) {
					result = version;
					vMin = v;
				}
			}
			return result;
		}
		const u = parseVersion(range);
		if (u) {
			let result = null;
			let vMin;
			for (const version of versions) {
				const v = parseVersion(version);
				if (!v) continue;
				if (compare(v, u) < 0) continue;
				if (!vMin || compare(v, vMin) < 0) {
					result = version;
					vMin = v;
				}
			}
			return result;
		}
		return null;
	}
	getPinnedValue(newVersion) {
		const v = parseVersion(newVersion);
		if (!v) return "";
		return rangeToString({
			type: "nuget-exact-range",
			version: v
		});
	}
	getNewValue({ currentValue, newVersion }) {
		const v = parseVersion(newVersion);
		if (!v) return null;
		if (this.isVersion(currentValue)) return newVersion;
		const r = parseRange(currentValue);
		if (!r) return null;
		if (this.isLessThanRange(newVersion, currentValue)) return currentValue;
		if (r.type === "nuget-exact-range") return rangeToString({
			type: "nuget-exact-range",
			version: v
		});
		if (r.type === "nuget-floating-range") {
			const floating = r.floating;
			if (!floating) return versionToString(v);
			const res = { ...r };
			if (floating === "major") {
				res.major = coerceFloatingComponent(v.major);
				return tryBump(res, v, currentValue);
			}
			res.major = v.major;
			if (floating === "minor") {
				res.minor = coerceFloatingComponent(v.minor);
				return tryBump(res, v, currentValue);
			}
			res.minor = v.minor ?? 0;
			if (floating === "patch") {
				res.patch = coerceFloatingComponent(v.patch);
				return tryBump(res, v, currentValue);
			}
			res.patch = v.patch ?? 0;
			res.revision = coerceFloatingComponent(v.revision);
			return tryBump(res, v, currentValue);
		}
		const res = { ...r };
		if (!r.max) {
			res.min = v;
			res.minInclusive = true;
			return rangeToString(res);
		}
		if (matches(v, r)) return currentValue;
		if (!r.min) {
			res.max = v;
			res.maxInclusive = true;
			return rangeToString(res);
		}
		res.max = v;
		res.maxInclusive = true;
		return rangeToString(res);
	}
	sortVersions(version, other) {
		const x = parseVersion(version);
		const y = parseVersion(other);
		if (!x || !y) return 0;
		return compare(x, y);
	}
	matches(version, range) {
		const v = parseVersion(version);
		if (!v) return false;
		const u = parseVersion(range);
		if (u) {
			if (v.prerelease && !u.prerelease) return false;
			return compare(v, u) >= 0;
		}
		const r = parseRange(range);
		if (!r) return false;
		return matches(v, r);
	}
};
const api = new NugetVersioningApi();
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map