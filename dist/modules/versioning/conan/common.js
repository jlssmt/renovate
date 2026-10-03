import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { isString } from "@sindresorhus/is";
import * as semver$1 from "semver";
//#region lib/modules/versioning/conan/common.ts
function makeVersion(version, options) {
	const splitVersion = version.split(".");
	const prerelease = semver$1.prerelease(version, options);
	if (prerelease && !options.includePrerelease) {
		if (!Number.isNaN(parseInt(prerelease.toString()[0], 10))) {
			const stringVersion = `${splitVersion[0]}.${splitVersion[1]}.${splitVersion[2]}`;
			return semver$1.valid(stringVersion, options);
		}
		return false;
	}
	if (options.loose && !semver$1.valid(version, options) && splitVersion.length !== 3) return semver$1.valid(semver$1.coerce(version, options), options);
	return semver$1.valid(version, options);
}
function cleanVersion(version) {
	if (version) return version.replace(regEx(/,|\[|\]|"|include_prerelease=|include_prerelease|loose=|True|False/g), "").trim();
	return version;
}
function getOptions(input) {
	let includePrerelease = false;
	let loose = true;
	if (input) {
		includePrerelease = input.includes("include_prerelease") && !input.includes("include_prerelease=False");
		loose = input.includes("loose=True") || !input.includes("loose=False");
	}
	return {
		loose,
		includePrerelease
	};
}
function containsOperators(input) {
	return regEx("[<=>^~]").test(input);
}
function matchesWithOptions(version, cleanRange, options) {
	let cleanedVersion = version;
	if (cleanedVersion && semver$1.prerelease(cleanedVersion) && options.includePrerelease) {
		const coercedVersion = semver$1.coerce(cleanedVersion)?.raw;
		cleanedVersion = coerceString(coercedVersion);
	}
	return semver$1.satisfies(cleanedVersion, cleanRange, options);
}
function findSatisfyingVersion(versions, range, compareRt) {
	const options = getOptions(range);
	let cur = null;
	let curSV = null;
	let index = 0;
	let curIndex = -1;
	for (const v of versions) {
		const versionFromList = makeVersion(v, options);
		if (isString(versionFromList)) {
			const cleanedVersion = cleanVersion(versionFromList);
			const options = getOptions(range);
			if (matchesWithOptions(cleanedVersion, cleanVersion(range), options) && (!cur || semver$1.compare(curSV, versionFromList, options) === compareRt)) {
				cur = versionFromList;
				curIndex = index;
				curSV = new semver$1.SemVer(cur, options);
			}
		}
		index += 1;
	}
	if (curIndex >= 0) return versions[curIndex];
	return null;
}
//#endregion
export { cleanVersion, containsOperators, findSatisfyingVersion, getOptions, makeVersion, matchesWithOptions };

//# sourceMappingURL=common.js.map