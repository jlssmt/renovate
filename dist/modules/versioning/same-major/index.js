import { logger } from "../../../logger/index.js";
import { api as api$1 } from "../semver-coerced/index.js";
//#region lib/modules/versioning/same-major/index.ts
const id = "same-major";
/**
*
* Converts input to range if it's a version. eg. X.Y.Z -> '>=X.Y.Z <X+1'
* If the input is already a range, it returns the input.
*/
function massageVersion(input) {
	// istanbul ignore if: same-major versioning should not be used with ranges as it defeats the purpose
	if (!api$1.isSingleVersion(input)) {
		logger.warn({ version: input }, "Same major versioning expects a single version but got a range. Please switch to a different versioning as this may lead to unexpected behaviour.");
		return input;
	}
	return `>=${input} <${api$1.getMajor(input) + 1}`;
}
function isGreaterThan(version, other) {
	const versionMajor = api$1.getMajor(version);
	const otherMajor = api$1.getMajor(other);
	if (!versionMajor || !otherMajor) return false;
	return versionMajor > otherMajor;
}
function matches(version, range) {
	return api$1.matches(version, massageVersion(range));
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions, massageVersion(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions, massageVersion(range));
}
function isLessThanRange(version, range) {
	return api$1.isLessThanRange(version, massageVersion(range));
}
const api = {
	...api$1,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	isLessThanRange,
	isGreaterThan
};
//#endregion
export { api, api as default, id };

//# sourceMappingURL=index.js.map