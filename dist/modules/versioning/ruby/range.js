import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { satisfies } from "@renovatebot/ruby-semver";
import { parse } from "@renovatebot/ruby-semver/dist/ruby/requirement.js";
import { create } from "@renovatebot/ruby-semver/dist/ruby/version.js";
//#region lib/modules/versioning/ruby/range.ts
function parse$1(range) {
	const regExp = regEx(/^(?<operator>[^\d\s]+)?(?<delimiter>\s*)(?<version>[0-9a-zA-Z-.]+)$/);
	const value = (range || "").trim();
	const match = regExp.exec(value);
	if (match?.groups) {
		const { version, operator = "", delimiter } = match.groups;
		return {
			version,
			operator,
			delimiter
		};
	}
	return {
		version: "",
		operator: "",
		delimiter: " "
	};
}
/** Wrapper for {@link satisfies} for {@link Range} record. */
function satisfiesRange(ver, range) {
	if (range.companion) return satisfies(ver, `${range.operator}${range.version}`) && satisfiesRange(ver, range.companion);
	return satisfies(ver, `${range.operator}${range.version}`);
}
/**
* Parses a comma-delimited list of range parts,
* with special treatment for a pair of `~>` and `>=` parts.
*/
function parseRanges(range) {
	const originalRanges = range.split(",").map(parse$1);
	const ranges = [];
	for (let i = 0; i < originalRanges.length;) if (i + 1 < originalRanges.length && originalRanges[i].operator === "~>" && originalRanges[i + 1].operator === ">=") {
		ranges.push({
			...originalRanges[i],
			companion: originalRanges[i + 1]
		});
		i += 2;
	} else {
		ranges.push(originalRanges[i]);
		i++;
	}
	return ranges;
}
/**
* Stringifies a list of range parts into a comma-separated string,
* with special treatment for a pair of `~>` and `>=` parts.
*/
function stringifyRanges(ranges) {
	return ranges.map((r) => {
		if (r.companion) return `${r.operator}${r.delimiter}${r.version}, ${r.companion.operator}${r.companion.delimiter}${r.companion.version}`;
		return `${r.operator}${r.delimiter}${r.version}`;
	}).join(", ");
}
function ltr(version, range) {
	const gemVersion = create(version);
	if (!gemVersion) {
		logger.warn({ version }, `Invalid ruby version`);
		return false;
	}
	return range.split(",").map(parse).map(([operator, ver]) => {
		switch (operator) {
			case ">":
			case "<": return gemVersion.compare(ver) <= 0;
			case ">=":
			case "<=":
			case "=":
			case "!=": return gemVersion.compare(ver) < 0;
			case "~>": return gemVersion.compare(ver) < 0 && gemVersion.release().compare(ver.bump()) <= 0;
			// istanbul ignore next
			default:
				logger.warn({ operator }, `Unsupported operator`);
				return false;
		}
	}).reduce((accumulator, value) => accumulator && value, true);
}
//#endregion
export { ltr, parse$1 as parse, parseRanges, satisfiesRange, stringifyRanges };

//# sourceMappingURL=range.js.map