import { regEx } from "../../../util/regex.js";
import { RANGE_COMPARATOR_PATTERN, VERSION_PATTERN } from "./patterns.js";
import semver from "semver";
//#region lib/modules/versioning/poetry/transform.ts
function parseLetterTag(letter, number) {
	if (letter !== void 0) return {
		letter: {
			alpha: "a",
			beta: "b",
			c: "rc",
			pre: "rc",
			preview: "rc",
			r: "post",
			rev: "post"
		}[letter] || letter,
		number: number ?? "0"
	};
	if (letter === void 0 && number !== void 0) return {
		letter: "post",
		number
	};
	return null;
}
function notEmpty(s) {
	return s !== "";
}
/**
* Parse versions like poetry.core.masonry.version.Version does (union of SemVer
* and PEP440, with normalization of certain prerelease tags), and emit in SemVer
* format. NOTE: this silently discards the epoch field in PEP440 versions, as
* it has no equivalent in SemVer.
*/
function poetry2semver(poetry_version, padRelease = true) {
	const matchGroups = VERSION_PATTERN.exec(poetry_version)?.groups;
	if (!matchGroups) return null;
	const releaseParts = matchGroups.release.split(".").map((segment) => parseInt(segment, 10));
	while (padRelease && releaseParts.length < 3) releaseParts.push(0);
	const pre = parseLetterTag(matchGroups.pre_l, matchGroups.pre_n);
	const post = matchGroups.post_n1 ? parseLetterTag(void 0, matchGroups.post_n1) : parseLetterTag(matchGroups.post_l, matchGroups.post_n);
	const dev = parseLetterTag(matchGroups.dev_l, matchGroups.dev_n);
	const parts = [releaseParts.map((num) => num.toString()).join(".")];
	if (pre !== null) {
		pre.number = pre.number.replace(regEx(/^0+(?<digits>\d+)/), "$<digits>");
		parts.push(`-${pre.letter}.${pre.number}`);
	}
	if (post !== null) {
		post.number = post.number.replace(regEx(/^0+(?<digits>\d+)/), "$<digits>");
		parts.push(`-${post.letter}.${post.number}`);
	}
	if (dev !== null) {
		dev.number = dev.number.replace(regEx(/^0+(?<digits>\d+)/), "$<digits>");
		parts.push(`-${dev.letter}.${dev.number}`);
	}
	return semver.valid(parts.join(""));
}
/** Reverse normalizations applied by poetry2semver */
function semver2poetry(version) {
	if (!version) return null;
	const s = semver.parse(version);
	if (!s) return null;
	const spellings = {
		a: "alpha",
		b: "beta",
		c: "rc",
		dev: "alpha"
	};
	s.prerelease = s.prerelease.map((letter) => spellings[letter] ?? letter);
	return s.format();
}
/**
* Translate a poetry-style version range to npm format
*
* This function works like cargo2npm, but it doesn't
* add a '^', because poetry treats versions without operators as
* exact versions.
*/
function poetry2npm(input, throwOnUnsupported = false) {
	const transformed = input.split(",").map((str) => str.trim()).filter(notEmpty).join(" ").split(RANGE_COMPARATOR_PATTERN).map((chunk) => poetry2semver(chunk, false) ?? chunk).join("").replace(regEx(/===/), "=");
	if (throwOnUnsupported) {
		if (transformed.split(regEx(/\s+/)).some((part) => part.startsWith("!="))) throw new Error("Unsupported by Poetry versioning implementation");
	}
	return transformed;
}
/**
* Translate an npm-style version range to poetry format
*
* NOTE: This function is largely copied from cargo versioning code.
* Poetry uses commas (like in cargo) instead of spaces (like in npm)
* for AND operation.
*/
function npm2poetry(range) {
	const res = range.split(RANGE_COMPARATOR_PATTERN).map((chunk) => semver2poetry(chunk) ?? chunk).join("").split(" ").map((str) => str.trim()).filter(notEmpty);
	const operators = [
		"^",
		"~",
		"=",
		">",
		"<",
		"<=",
		">="
	];
	for (let i = 0; i < res.length - 1; i += 1) if (operators.includes(res[i])) {
		const newValue = `${res[i]} ${res[i + 1]}`;
		res.splice(i, 2, newValue);
	}
	return res.join(", ").replace(regEx(/\s*,?\s*\|\|\s*,?\s*/g), " || ");
}
//#endregion
export { npm2poetry, poetry2npm, poetry2semver, semver2poetry };

//# sourceMappingURL=transform.js.map