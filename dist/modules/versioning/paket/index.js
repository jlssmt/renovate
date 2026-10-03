import { parseVersion } from "../nuget/parser.js";
import { compare, sameReleaseParts } from "./version.js";
import { adaptToPrecision, bumpAtPrecision, ensurePrereleaseMatches, intervalOf, isLessThanLowerBound, matches as matches$1, parseRange, rangeToString, releaseParts, twiddle } from "./range.js";
//#region lib/modules/versioning/paket/index.ts
const id = "paket";
function isVersion(input) {
	return !!input && parseVersion(input) !== null;
}
function isValid(input) {
	return parseRange(input) !== null;
}
function isSingleVersionRange(range) {
	if (range.constraints.length !== 1 || range.prereleaseTags.length > 0) return false;
	const { operator } = range.constraints[0];
	return operator === "" || operator === "=" || operator === "==";
}
function isSingleVersion(input) {
	const range = parseRange(input);
	return !!range && isSingleVersionRange(range);
}
function isStable(input) {
	const version = parseVersion(input);
	if (version) return !version.prerelease;
	const range = parseRange(input);
	return !!range && isSingleVersionRange(range) && !range.constraints[0].version.prerelease;
}
function isCompatible(version) {
	return isVersion(version);
}
function getMajor(version) {
	return parseVersion(version)?.major ?? null;
}
function getMinor(version) {
	return parseVersion(version)?.minor ?? null;
}
function getPatch(version) {
	return parseVersion(version)?.patch ?? null;
}
function compareVersions(version, other) {
	const x = parseVersion(version);
	const y = parseVersion(other);
	return x && y ? compare(x, y) : null;
}
function equals(version, other) {
	return compareVersions(version, other) === 0;
}
function isGreaterThan(version, other) {
	const cmp = compareVersions(version, other);
	return cmp !== null && cmp > 0;
}
function sortVersions(version, other) {
	return compareVersions(version, other) ?? 0;
}
function matches(version, range) {
	const v = parseVersion(version);
	const r = parseRange(range);
	return !!v && !!r && matches$1(v, r);
}
function isLessThanRange(version, range) {
	const v = parseVersion(version);
	const r = parseRange(range);
	return !!v && !!r && isLessThanLowerBound(v, r);
}
function satisfyingVersions(versions, range) {
	return versions.filter((v) => matches(v, range)).sort(sortVersions);
}
function getSatisfyingVersion(versions, range) {
	return satisfyingVersions(versions, range).pop() ?? null;
}
function minSatisfyingVersion(versions, range) {
	return satisfyingVersions(versions, range).shift() ?? null;
}
function getPinnedValue(newVersion) {
	return newVersion;
}
function replaceConstraint(constraint, v) {
	const { operator, version } = constraint;
	switch (operator) {
		case "":
		case "=":
		case "==": return {
			operator,
			version: v
		};
		case ">":
		case ">=": return constraint;
		case "<=": return compare(v, version) > 0 ? {
			operator,
			version: v
		} : constraint;
		case "<": return compare(v, version) >= 0 || sameReleaseParts(v, version) ? {
			operator,
			version: bumpAtPrecision(v, releaseParts(version).length)
		} : constraint;
		case "~>": {
			const cap = twiddle(version);
			return compare(v, cap) >= 0 || sameReleaseParts(v, cap) ? {
				operator,
				version: adaptToPrecision(v, releaseParts(version).length)
			} : constraint;
		}
	}
}
/**
* Rewrite `~> band` optionally followed by a `>=`/`>` floor: the band follows
* the new version at its old precision, and the floor sticks to the exact new
* version unless it becomes redundant.
*/
function pessimisticWithFloor(range, v) {
	const [pessimistic] = range.constraints;
	const band = adaptToPrecision(v, releaseParts(pessimistic.version).length);
	const constraints = compare(band, v) === 0 ? [{
		operator: "~>",
		version: band
	}] : [{
		operator: "~>",
		version: band
	}, {
		operator: ">=",
		version: v
	}];
	return {
		...range,
		constraints
	};
}
function replaceRange(range, v) {
	const [first, second] = range.constraints;
	if (first.operator === "~>" && (second?.operator === ">" || second?.operator === ">=")) return pessimisticWithFloor(range, v);
	return {
		...range,
		constraints: range.constraints.map((c) => replaceConstraint(c, v))
	};
}
function bumpConstraint(constraint, v) {
	const { operator, version } = constraint;
	switch (operator) {
		case ">=": return compare(v, version) > 0 ? {
			operator,
			version: v
		} : constraint;
		case ">": return {
			operator: ">=",
			version: v
		};
		case "~>": {
			const adapted = adaptToPrecision(v, releaseParts(version).length);
			return compare(adapted, version) > 0 ? {
				operator,
				version: adapted
			} : constraint;
		}
		default: return replaceConstraint(constraint, v);
	}
}
function bumpRange(range, v) {
	const [first, second] = range.constraints;
	if (first.operator === "~>" && second?.operator !== "<" && second?.operator !== "<=") return pessimisticWithFloor(range, v);
	return {
		...range,
		constraints: range.constraints.map((c) => bumpConstraint(c, v))
	};
}
function widenRange(range, v) {
	const interval = intervalOf(range.constraints);
	const [first] = range.constraints;
	if (interval.kind !== "range" || first.operator !== "~>") return {
		...range,
		constraints: range.constraints.map((c) => replaceConstraint(c, v))
	};
	const { from, fromInclusive, to, toInclusive } = interval;
	if (!(toInclusive ? compare(v, to) > 0 : compare(v, to) >= 0 || sameReleaseParts(v, to))) return range;
	const lower = {
		operator: fromInclusive ? ">=" : ">",
		version: from
	};
	const upper = toInclusive ? {
		operator: "<=",
		version: v
	} : {
		operator: "<",
		version: bumpAtPrecision(v, releaseParts(to).length)
	};
	return {
		...range,
		constraints: [lower, upper]
	};
}
function getNewValue({ currentValue, rangeStrategy, newVersion }) {
	const v = parseVersion(newVersion);
	if (!v) return null;
	if (isVersion(currentValue)) return newVersion;
	const range = parseRange(currentValue);
	if (!range) return null;
	if (rangeStrategy === "pin") return `${range.strategy ?? ""}${newVersion}`;
	if (isLessThanLowerBound(v, range)) return currentValue;
	let result;
	if (rangeStrategy === "bump") result = bumpRange(range, v);
	else if (matches$1(v, range)) return currentValue;
	else if (rangeStrategy === "widen") result = widenRange(range, v);
	else result = replaceRange(range, v);
	const newValue = rangeToString(ensurePrereleaseMatches(result, v));
	return newValue === rangeToString(range) ? currentValue : newValue;
}
const api = {
	equals,
	getMajor,
	getMinor,
	getPatch,
	getNewValue,
	getPinnedValue,
	getSatisfyingVersion,
	minSatisfyingVersion,
	isCompatible,
	isGreaterThan,
	isLessThanRange,
	isSingleVersion,
	isStable,
	isValid,
	isVersion,
	matches,
	sortVersions
};
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map