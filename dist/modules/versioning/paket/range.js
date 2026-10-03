import { regEx } from "../../../util/regex.js";
import { isNotNullOrUndefined } from "../../../util/array.js";
import { parseVersion } from "../nuget/parser.js";
import { versionToString } from "../nuget/version.js";
import { compare, sameReleaseParts } from "./version.js";
//#region lib/modules/versioning/paket/range.ts
const constraintOperators = [
	"=",
	"==",
	">",
	">=",
	"<",
	"<=",
	"~>"
];
const prereleaseTagRegex = regEx(/^[a-zA-Z][a-zA-Z0-9-]*$/);
/**
* Paket only accepts these operator combinations for two-part constraints.
*/
function isValidPair(first, second) {
	if (first === "~>") return second === ">" || second === ">=" || second === "<" || second === "<=";
	if (first === ">" || first === ">=") return second === "<" || second === "<=";
	return false;
}
function parseRange(input) {
	if (!input?.trim()) return null;
	let text = input.trim();
	let strategy = null;
	if (text.startsWith("!") || text.startsWith("@")) {
		strategy = text[0];
		text = text.slice(1).trim();
	}
	const tokens = text.split(regEx(/\s+/));
	const constraints = [];
	let idx = 0;
	while (idx < tokens.length && constraints.length < 2 && constraintOperators.includes(tokens[idx])) {
		const operator = tokens[idx];
		const versionToken = tokens[idx + 1];
		const version = versionToken ? parseVersion(versionToken) : null;
		if (!version) return null;
		constraints.push({
			operator,
			version
		});
		idx += 2;
	}
	if (constraints.length === 0) {
		const version = parseVersion(tokens[0]);
		if (!version) return null;
		constraints.push({
			operator: "",
			version
		});
		idx = 1;
	}
	if (constraints.length === 2 && !isValidPair(constraints[0].operator, constraints[1].operator)) return null;
	const prereleaseTags = [];
	for (const token of tokens.slice(idx)) {
		if (!prereleaseTagRegex.test(token)) return null;
		if (!prereleaseTags.includes(token)) prereleaseTags.push(token);
	}
	return {
		strategy,
		constraints,
		prereleaseTags
	};
}
function rangeToString(range) {
	const parts = [];
	for (const { operator, version } of range.constraints) {
		const versionStr = versionToString(version);
		parts.push(operator === "" ? versionStr : `${operator} ${versionStr}`);
	}
	parts.push(...range.prereleaseTags);
	return `${range.strategy ?? ""}${parts.join(" ")}`;
}
function releaseParts(version) {
	const { major, minor, patch, revision } = version;
	return [
		major,
		minor,
		patch,
		revision
	].filter(isNotNullOrUndefined);
}
function versionFromParts(parts) {
	const [major, minor, patch, revision] = parts;
	const result = {
		type: "nuget-version",
		major
	};
	if (minor !== void 0) result.minor = minor;
	if (patch !== void 0) result.patch = patch;
	if (revision !== void 0) result.revision = revision;
	return result;
}
function adaptToPrecision(version, precision) {
	const parts = releaseParts(version).slice(0, precision);
	while (parts.length < precision) parts.push(0);
	return versionFromParts(parts);
}
function bumpAtPrecision(version, precision) {
	const parts = releaseParts(adaptToPrecision(version, precision));
	parts[precision - 1] += 1;
	return versionFromParts(parts);
}
/**
* Upper bound of the pessimistic operator: chop off the last release part and
* increment the remaining last number, so `~> 1.2.3` allows `< 1.3` and
* `~> 1.2` allows `< 2`.
*/
function twiddle(version) {
	return bumpAtPrecision(version, Math.max(releaseParts(version).length - 1, 1));
}
function intervalOfPair(first, second) {
	if (first.operator === "~>") {
		const cap = twiddle(first.version);
		if (second.operator === ">" || second.operator === ">=") return {
			kind: "range",
			from: second.version,
			fromInclusive: second.operator === ">=",
			to: cap,
			toInclusive: false
		};
		const to = compare(second.version, cap) < 0 ? second.version : cap;
		return {
			kind: "range",
			from: first.version,
			fromInclusive: true,
			to,
			toInclusive: second.operator === "<="
		};
	}
	return {
		kind: "range",
		from: first.version,
		fromInclusive: first.operator === ">=",
		to: second.version,
		toInclusive: second.operator === "<="
	};
}
const singleOperatorKind = {
	"": "specific",
	"=": "specific",
	"==": "override",
	">=": "minimum",
	">": "greater-than",
	"<=": "maximum",
	"<": "less-than"
};
function intervalOf(constraints) {
	if (constraints.length === 2) return intervalOfPair(constraints[0], constraints[1]);
	const [{ operator, version }] = constraints;
	if (operator === "~>") return {
		kind: "range",
		from: version,
		fromInclusive: true,
		to: twiddle(version),
		toInclusive: false
	};
	return {
		kind: singleOperatorKind[operator],
		version
	};
}
const numericSegmentRegex = regEx(/^\d+$/);
const channelPrefixRegex = regEx(/^[a-zA-Z]+(?:-[a-zA-Z]+)*/);
function channelFromSegments(segments) {
	const [first, second] = segments;
	if (first && !numericSegmentRegex.test(first)) return first;
	if (second && !numericSegmentRegex.test(second)) return second;
	return "";
}
/**
* The channel name of a prerelease suffix, e.g. `alpha` for `alpha001` or
* `beta` for `beta.2`.
*/
function prereleaseChannel(prerelease) {
	const segments = prerelease.split(".");
	if (segments.length > 1) return channelFromSegments(segments);
	const prefix = channelPrefixRegex.exec(prerelease);
	if (prefix) return prefix[0];
	return channelFromSegments(prerelease.split("-").filter((segment) => segment !== ""));
}
function prereleaseStatusOf(range, interval) {
	const { prereleaseTags } = range;
	if (prereleaseTags.length === 1 && prereleaseTags[0].toLowerCase() === "prerelease") return "all";
	if (prereleaseTags.length > 0) return prereleaseTags;
	const bounds = interval.kind === "range" ? [interval.from, interval.to] : [interval.version];
	const channels = [];
	for (const bound of bounds) {
		if (!bound.prerelease) continue;
		const channel = prereleaseChannel(bound.prerelease);
		if (!channels.includes(channel)) channels.push(channel);
	}
	return channels.length > 0 ? channels : "none";
}
function isPrereleaseAllowed(version, status) {
	if (status === "all") return true;
	if (status === "none") return !version.prerelease;
	if (!version.prerelease) return true;
	return status.includes(prereleaseChannel(version.prerelease));
}
/**
* Paket rule: a prerelease of a stable bound version counts as being in range
* when its channel is allowed, e.g. `1.2.3-alpha1` satisfies `= 1.2.3 alpha`.
*/
function isPrereleaseOfBound(version, bound, status) {
	return status !== "none" && !bound.prerelease && sameReleaseParts(version, bound) && isPrereleaseAllowed(version, status);
}
function matches(version, range) {
	const interval = intervalOf(range.constraints);
	const status = prereleaseStatusOf(range, interval);
	switch (interval.kind) {
		case "specific": return compare(version, interval.version) === 0 || isPrereleaseOfBound(version, interval.version, status);
		case "override": return compare(version, interval.version) === 0;
		case "minimum": {
			const cmp = compare(version, interval.version);
			return cmp === 0 || cmp > 0 && isPrereleaseAllowed(version, status) || isPrereleaseOfBound(version, interval.version, status);
		}
		case "greater-than": return compare(version, interval.version) > 0 && isPrereleaseAllowed(version, status);
		case "maximum": {
			const cmp = compare(version, interval.version);
			return cmp === 0 || cmp < 0 && isPrereleaseAllowed(version, status);
		}
		case "less-than": return compare(version, interval.version) < 0 && isPrereleaseAllowed(version, status) && !isPrereleaseOfBound(version, interval.version, status);
		case "range": {
			const { from, fromInclusive, to, toInclusive } = interval;
			const lowerCmp = compare(version, from);
			const upperCmp = compare(version, to);
			const inLower = fromInclusive ? lowerCmp >= 0 : lowerCmp > 0;
			const inUpper = toInclusive ? upperCmp <= 0 : upperCmp < 0 && !isPrereleaseOfBound(version, to, status);
			return inLower && inUpper && isPrereleaseAllowed(version, status) || isPrereleaseOfBound(version, from, status);
		}
	}
}
function isLessThanLowerBound(version, range) {
	const interval = intervalOf(range.constraints);
	switch (interval.kind) {
		case "specific":
		case "override":
		case "minimum": return compare(version, interval.version) < 0;
		case "greater-than": return compare(version, interval.version) <= 0;
		case "maximum":
		case "less-than": return false;
		case "range": return interval.fromInclusive ? compare(version, interval.from) < 0 : compare(version, interval.from) <= 0;
	}
}
/**
* A rewritten range admits the new version numerically, but its prerelease
* channel may still be blocked, so allow the channel with an explicit tag.
*/
function ensurePrereleaseMatches(range, version) {
	if (!version.prerelease || matches(version, range)) return range;
	const channel = prereleaseChannel(version.prerelease);
	if (prereleaseTagRegex.test(channel)) return {
		...range,
		prereleaseTags: [...range.prereleaseTags, channel]
	};
	return {
		...range,
		prereleaseTags: ["prerelease"]
	};
}
//#endregion
export { adaptToPrecision, bumpAtPrecision, ensurePrereleaseMatches, intervalOf, isLessThanLowerBound, matches, parseRange, prereleaseChannel, rangeToString, releaseParts, twiddle };

//# sourceMappingURL=range.js.map