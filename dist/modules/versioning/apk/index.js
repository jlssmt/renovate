import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { GenericVersioningApi } from "../generic.js";
import { isTruthy } from "@sindresorhus/is";
/**
* APK constraint operators, as the bitmask `apk` builds them into.
*
* `apk` ORs one flag per operator character, so the characters may appear in any order and may repeat - `~`, `=~` and `~=` all mean the same thing.
*
* Based on `GPL-2.0` code in https://gitlab.alpinelinux.org/alpine/apk-tools/-/blob/master/src/version.c
*/
const OP_LESS = 1;
const OP_GREATER = 2;
const OP_EQUAL = 4;
const OP_FUZZY = 8;
/** A prefix match, e.g. `~1.6` - `apk` treats `~` as fuzzy /and/ equal */
const OP_PREFIX = 12;
/** `><` constrains a package to an identity hash rather than to a version */
const OP_CHECKSUM = 3;
const constraintRegex = regEx(/^(?<operator>[<>=~]*)(?<version>[^<>=~].*)$/);
function operatorMask(operator) {
	let mask = 0;
	for (const char of operator) if (char === "<") mask |= OP_LESS;
	else if (char === ">") mask |= OP_GREATER;
	else if (char === "=") mask |= OP_EQUAL;
	else mask |= OP_PREFIX;
	if (mask === 0) return OP_EQUAL;
	return mask === OP_CHECKSUM ? null : mask;
}
/** Splits a constraint such as `~8.12.1` into its operator and version */
function parseConstraint(input) {
	if (!input) return null;
	const groups = constraintRegex.exec(input)?.groups;
	if (!groups) return null;
	const mask = operatorMask(groups.operator);
	if (mask === null) return null;
	return {
		operator: groups.operator,
		mask,
		version: groups.version
	};
}
const versionRegex = regEx(/^v?(?<major>[0-9]+)(?:\.(?<minor>[0-9]+))?(?:\.(?<patch>[0-9]+))?(?<extra>(?:\.[0-9]+)*)(?<letter>[a-z])?(?:(?<prereleaseType>_alpha|_beta|_pre|_rc)(?<prereleaseNum>[0-9]*))?(?:(?<packageFixType>_cvs|_svn|_git|_hg|_p)(?<packageFixNum>[0-9]*))?(?:-r(?<releaseNum>[0-9]+))?$/);
const alphaNumRegex = regEx(/(?:[a-zA-Z]+)|(?:\d+)/g);
const revisionRegex = regEx(/-r\d+$/);
/**
* The kinds of token an APK version is made of, in the order `apk` reads them.
*
* A prefix match compares tokens pairwise, so a token's kind has to be part of the comparison - `1.6_rc1` is not a prefix of `1.6.0`, even though both start with `1.6`.
*/
const TOKEN_DIGIT = 0;
const TOKEN_LETTER = 1;
const TOKEN_PRERELEASE = 2;
const TOKEN_PACKAGE_FIX = 3;
const TOKEN_REVISION = 4;
/** The numeric components of a version, e.g. `[1, 6, 0]` for `1.6.0_pre1` */
function numericParts(groups) {
	const { major, minor, patch, extra } = groups;
	const parts = [parseInt(major, 10)];
	for (const part of [minor, patch]) if (part) parts.push(parseInt(part, 10));
	if (extra) parts.push(...extra.substring(1).split(".").filter(isTruthy).map(Number));
	return parts;
}
function tokenize(groups) {
	const { letter, prereleaseType, prereleaseNum, packageFixType, packageFixNum, releaseNum } = groups;
	const tokens = numericParts(groups).map((value) => ({
		kind: TOKEN_DIGIT,
		value
	}));
	if (letter) tokens.push({
		kind: TOKEN_LETTER,
		value: letter
	});
	if (prereleaseType) tokens.push({
		kind: TOKEN_PRERELEASE,
		value: prereleaseType + prereleaseNum
	});
	if (packageFixType) tokens.push({
		kind: TOKEN_PACKAGE_FIX,
		value: packageFixType + packageFixNum
	});
	if (releaseNum) tokens.push({
		kind: TOKEN_REVISION,
		value: parseInt(releaseNum, 10)
	});
	return tokens;
}
/**
* Whether `constraintVersion` is a token-wise prefix of `version`, which is what `apk` calls a fuzzy match.
*
* `~1.6` matches `1.6`, `1.6.0_pre1`, `1.6.0`, `1.6.5` and `1.6.9_p1`, but not `1.60` - the comparison is per token, not on the raw string.
*/
function isPrefixMatch(version, constraintVersion) {
	const versionGroups = versionRegex.exec(version)?.groups;
	const constraintGroups = versionRegex.exec(constraintVersion)?.groups;
	/* v8 ignore next -- `matches` parses both versions before calling this */
	if (!versionGroups || !constraintGroups) return false;
	const versionTokens = tokenize(versionGroups);
	const constraintTokens = tokenize(constraintGroups);
	if (constraintTokens.length > versionTokens.length) return false;
	return constraintTokens.every((token, i) => token.kind === versionTokens[i].kind && token.value === versionTokens[i].value);
}
/** Drops the revision when the constraint was written without one */
function withConstraintRevision(newVersion, constraintVersion) {
	if (revisionRegex.test(constraintVersion)) return newVersion;
	return newVersion.replace(revisionRegex, "");
}
var ApkVersioningApi = class extends GenericVersioningApi {
	/**
	* Parse APK version format using apko's version parsing patterns
	* Based on `Apache-2.0` code in https://github.com/chainguard-dev/apko/blob/v0.30.35/pkg/apk/apk/version.go
	*/
	_parse(version) {
		const match = versionRegex.exec(version);
		if (!match?.groups) return null;
		const { major, minor, patch, extra, letter, prereleaseType, prereleaseNum, packageFixType, packageFixNum, releaseNum } = match.groups;
		const packageFixFull = packageFixType ? packageFixType + packageFixNum : "";
		const versionStr = major + ((minor ? `.${minor}` : "") + (patch ? `.${patch}` : "") + extra) + (letter ?? "") + packageFixFull;
		let prerelease;
		if (prereleaseType) prerelease = prereleaseType.substring(1) + prereleaseNum;
		const release = [parseInt(major, 10)];
		if (minor) release.push(parseInt(minor, 10));
		if (patch) release.push(parseInt(patch, 10));
		if (extra) {
			const extraParts = extra.substring(1).split(".").filter(isTruthy).map(Number);
			release.push(...extraParts);
		}
		return {
			version: versionStr,
			releaseString: releaseNum ?? "",
			release,
			prerelease
		};
	}
	/**
	* Compare two APK versions according to Alpine Linux rules
	*/
	_compare(version, other) {
		const parsed1 = this._parse(version);
		const parsed2 = this._parse(other);
		if (!(parsed1 && parsed2)) return 1;
		const versionCompare = this._compareVersionParts(parsed1.version, parsed2.version);
		if (versionCompare !== 0) return versionCompare;
		const prerelease1 = parsed1.prerelease;
		const prerelease2 = parsed2.prerelease;
		if (prerelease1 || prerelease2) {
			if (!prerelease1) return -1;
			if (!prerelease2) return 1;
			const prereleaseCompare = prerelease1.localeCompare(prerelease2);
			if (prereleaseCompare !== 0) return prereleaseCompare;
		}
		const release1 = parsed1.releaseString || "";
		const release2 = parsed2.releaseString || "";
		if (release1 && !release2) return 1;
		if (!release1 && release2) return -1;
		return this._compareVersionParts(release1 || "0", release2 || "0");
	}
	/**
	* Compare version parts using APK's version comparison rules
	*/
	_compareVersionParts(v1, v2) {
		if (v1 === v2) return 0;
		const matchesv1 = v1.match(alphaNumRegex);
		const matchesv2 = v2.match(alphaNumRegex);
		const matches = Math.min(matchesv1.length, matchesv2.length);
		for (let i = 0; i < matches; i++) {
			const matchv1 = matchesv1[i];
			const matchv2 = matchesv2[i];
			if (matchv1 && regEx(/^\d+$/).test(matchv1)) {
				if (!matchv2 || !regEx(/^\d+$/).test(matchv2)) return 1;
				const num1 = parseInt(matchv1, 10);
				const num2 = parseInt(matchv2, 10);
				if (num1 !== num2) return num1 - num2;
			} else if (matchv2 && regEx(/^\d+$/).test(matchv2)) return -1;
			else if (matchv1 !== matchv2) return matchv1.localeCompare(matchv2);
		}
		if (matchesv1.length !== matchesv2.length) {
			const maxLength = Math.max(matchesv1.length, matchesv2.length);
			for (let i = matches; i < maxLength; i++) {
				const matchv1 = matchesv1[i];
				const matchv2 = matchesv2[i];
				if (matchv1 && regEx(/^\d+$/).test(matchv1)) return 1;
				if (matchv2 && regEx(/^\d+$/).test(matchv2)) return -1;
				if (matchv1) return -1;
				return 1;
			}
		}
		return 0;
	}
	isValid(input) {
		const constraint = parseConstraint(input);
		return !!constraint && this._parse(constraint.version) !== null;
	}
	/** A constraint is not itself a version, however valid it is */
	isVersion(input) {
		const constraint = parseConstraint(input);
		return !!constraint && constraint.operator === "" && this._parse(constraint.version) !== null;
	}
	isSingleVersion(input) {
		const constraint = parseConstraint(input);
		return !!constraint && constraint.mask === OP_EQUAL && this._parse(constraint.version) !== null;
	}
	isStable(input) {
		const constraint = parseConstraint(input);
		if (!constraint) return false;
		const parsed = this._parse(constraint.version);
		return !!parsed && !parsed.prerelease;
	}
	/**
	* Whether `version` satisfies the constraint, following `apk_version_match`: compare the two, fuzzily when the operator asks for it, then check the result against the operator's mask.
	*/
	matches(version, range) {
		const constraint = parseConstraint(range);
		if (!constraint || !this._parse(version) || !this._parse(constraint.version)) return false;
		if ((constraint.mask & OP_FUZZY) !== 0 && isPrefixMatch(version, constraint.version)) return (constraint.mask & OP_EQUAL) !== 0;
		const compared = this._compare(version, constraint.version);
		if (compared < 0) return (constraint.mask & OP_LESS) !== 0;
		if (compared > 0) return (constraint.mask & OP_GREATER) !== 0;
		return (constraint.mask & OP_EQUAL) !== 0;
	}
	isLessThanRange(version, range) {
		const constraint = parseConstraint(range);
		if (!constraint || !this._parse(version) || !this._parse(constraint.version)) return false;
		if ((constraint.mask & OP_LESS) !== 0) return false;
		if ((constraint.mask & OP_FUZZY) !== 0 && isPrefixMatch(version, constraint.version)) return false;
		const compared = this._compare(version, constraint.version);
		if (compared !== 0) return compared < 0;
		return (constraint.mask & OP_EQUAL) === 0;
	}
	getSatisfyingVersion(versions, range) {
		const satisfying = versions.filter((version) => this.matches(version, range));
		if (!satisfying.length) return null;
		return satisfying.sort((a, b) => this.sortVersions(b, a))[0];
	}
	minSatisfyingVersion(versions, range) {
		const satisfying = versions.filter((version) => this.matches(version, range));
		if (!satisfying.length) return null;
		return satisfying.sort((a, b) => this.sortVersions(a, b))[0];
	}
	getMajor(input) {
		const constraint = parseConstraint(input);
		return constraint ? this._parse(constraint.version)?.release[0] ?? null : null;
	}
	getMinor(input) {
		const constraint = parseConstraint(input);
		return constraint ? this._parse(constraint.version)?.release[1] ?? null : null;
	}
	getPatch(input) {
		const constraint = parseConstraint(input);
		return constraint ? this._parse(constraint.version)?.release[2] ?? null : null;
	}
	getNewValue({ currentValue, rangeStrategy, newVersion }) {
		const constraint = parseConstraint(currentValue);
		if (!constraint) return null;
		const { operator, mask, version } = constraint;
		const parsed = this._parse(version);
		if (!parsed) return null;
		if (rangeStrategy === "pin") return newVersion;
		if (mask === OP_EQUAL) return `${operator}${withConstraintRevision(newVersion, version)}`;
		if (rangeStrategy === "bump" && (mask & OP_GREATER) !== 0 && (mask & OP_EQUAL) !== 0) return `${operator}${newVersion}`;
		if (mask === OP_PREFIX) {
			const currentParts = parsed.release;
			const newParts = this._parse(newVersion)?.release;
			/* v8 ignore next -- newVersion comes from the datasource, so it parses */
			if (!newParts) return null;
			if (currentParts.length < newParts.length) return `${operator}${newParts.slice(0, currentParts.length).join(".")}`;
			return `${operator}${withConstraintRevision(newVersion, version)}`;
		}
		if (rangeStrategy === "bump") logger.debug(`Unsupported range type for rangeStrategy=bump: ${currentValue}`);
		return null;
	}
	sortVersions(a, b) {
		const cleanA = a.replace(regEx(/^=/), "");
		const cleanB = b.replace(regEx(/^=/), "");
		return super.sortVersions(cleanA, cleanB);
	}
};
const api = new ApkVersioningApi();
//#endregion
export { api, api as default };

//# sourceMappingURL=index.js.map