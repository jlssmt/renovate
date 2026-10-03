import { api as api$1 } from "../pep440/index.js";
import { api as api$2 } from "../poetry/index.js";
//#region lib/modules/versioning/python/index.ts
const id = "python";
function isLessThanRange(version, range) {
	return api$2.isValid(range) ? api$2.isLessThanRange(version, range) : api$1.isLessThanRange(version, range);
}
function isValid(input) {
	return api$2.isValid(input) || api$1.isValid(input);
}
function matches(version, range) {
	return api$2.isValid(range) ? api$2.matches(version, range) : api$1.matches(version, range);
}
function getSatisfyingVersion(versions, range) {
	return api$2.isValid(range) ? api$2.getSatisfyingVersion(versions, range) : api$1.getSatisfyingVersion(versions, range);
}
function minSatisfyingVersion(versions, range) {
	return api$2.isValid(range) ? api$2.minSatisfyingVersion(versions, range) : api$1.minSatisfyingVersion(versions, range);
}
function getNewValue(newValue) {
	return api$2.getNewValue(newValue);
}
function subset(subRange, superRange) {
	return api$2.isValid(subRange) && api$2.isValid(superRange) ? api$2.subset(subRange, superRange) : void 0;
}
function isBreaking(current, version) {
	const currentMajor = api$2.getMajor(current);
	const currentMinor = api$2.getMinor(current);
	const newMajor = api$2.getMajor(version);
	const newMinor = api$2.getMinor(version);
	return !(currentMajor === newMajor && currentMinor === newMinor);
}
const api = {
	...api$2,
	getNewValue,
	getSatisfyingVersion,
	isBreaking,
	isLessThanRange,
	isValid,
	matches,
	minSatisfyingVersion,
	subset
};
//#endregion
export { api, api as default, id, isBreaking };

//# sourceMappingURL=index.js.map