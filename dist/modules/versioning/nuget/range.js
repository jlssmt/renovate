import { regEx } from "../../../util/regex.js";
import { compare, versionToString } from "./version.js";
//#region lib/modules/versioning/nuget/range.ts
function getFloatingRangeLowerBound(range) {
	const { major, minor = 0, patch = 0, revision = 0, prerelease } = range;
	const res = {
		type: "nuget-version",
		major,
		minor,
		patch,
		revision
	};
	if (prerelease) {
		const parts = prerelease.split(".");
		const lastIdx = parts.length - 1;
		const last = parts[lastIdx];
		if (last === "*") parts[lastIdx] = "0";
		else parts[lastIdx] = last.replace(regEx(/\*$/), "");
		res.prerelease = parts.join(".");
	}
	return res;
}
function matches(v, r) {
	if (r.type === "nuget-exact-range") return compare(v, r.version) === 0;
	if (r.type === "nuget-floating-range") {
		if (!r.prerelease && v.prerelease) return false;
		const lowerBound = getFloatingRangeLowerBound(r);
		return compare(v, lowerBound) >= 0;
	}
	let minBoundMatches = false;
	let maxBoundMatches = false;
	const { min, minInclusive, max, maxInclusive } = r;
	if (min) {
		const minBound = min.type === "nuget-version" ? min : getFloatingRangeLowerBound(min);
		const cmp = compare(v, minBound);
		minBoundMatches = minInclusive ? cmp >= 0 : cmp > 0;
	} else minBoundMatches = true;
	if (max) {
		if (!(v.prerelease && !max.prerelease)) {
			const cmp = compare(v, max);
			maxBoundMatches = maxInclusive ? cmp <= 0 : cmp < 0;
		}
	} else maxBoundMatches = true;
	return minBoundMatches && maxBoundMatches;
}
function floatingComponentToString(component) {
	const int = component / 10;
	return int === 0 ? "*" : `${int}*`;
}
function coerceFloatingComponent(component) {
	return component ? Math.floor(component / 10) * 10 : 0;
}
function rangeToString(range) {
	if (range.type === "nuget-exact-range") return `[${versionToString(range.version)}]`;
	if (range.type === "nuget-floating-range") {
		const { major, minor, patch, revision, floating, prerelease } = range;
		let res = "";
		if (prerelease) res = `-${prerelease}`;
		if (revision !== void 0) res = `.${floating === "revision" ? floatingComponentToString(revision) : `${revision}`}${res}`;
		if (patch !== void 0) res = `.${floating === "patch" ? floatingComponentToString(patch) : `${patch}`}${res}`;
		if (minor !== void 0) res = `.${floating === "minor" ? floatingComponentToString(minor) : `${minor}`}${res}`;
		res = `${floating === "major" ? floatingComponentToString(major) : `${major}`}${res}`;
		return res;
	}
	const { min, max, minInclusive, maxInclusive } = range;
	const leftBracket = minInclusive ? "[" : "(";
	const rightBracket = maxInclusive ? "]" : ")";
	if (min && max) return `${leftBracket}${min.type === "nuget-version" ? versionToString(min) : rangeToString(min)},${versionToString(max)}${rightBracket}`;
	if (min) return `${leftBracket}${min.type === "nuget-version" ? versionToString(min) : rangeToString(min)},${rightBracket}`;
	return `${leftBracket},${versionToString(max)}${rightBracket}`;
}
function tryBump(r, v, x) {
	return matches(v, r) ? rangeToString(r) : x;
}
//#endregion
export { coerceFloatingComponent, getFloatingRangeLowerBound, matches, rangeToString, tryBump };

//# sourceMappingURL=range.js.map