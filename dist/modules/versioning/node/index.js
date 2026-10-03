import { api as api$1, isVersion } from "../npm/index.js";
import { findScheduleForCodename, findScheduleForVersion } from "./schedule.js";
import { DateTime } from "luxon";
import { valid } from "semver";
//#region lib/modules/versioning/node/index.ts
const id = "node";
function normalizeValue(value) {
	const schedule = findScheduleForCodename(value);
	if (schedule) return `^${schedule.version.replace("v", "")}`;
	return value;
}
function getNewValue({ currentValue, rangeStrategy, currentVersion, newVersion }) {
	if (rangeStrategy !== "pin" && findScheduleForCodename(currentValue)) {
		const newSchedule = findScheduleForVersion(newVersion);
		if (newSchedule?.codename) return newSchedule.codename.toLowerCase();
	}
	const res = api$1.getNewValue({
		currentValue: normalizeValue(currentValue),
		rangeStrategy,
		currentVersion,
		newVersion
	});
	if (res && isVersion(res)) return valid(res);
	return res;
}
function isValid(version) {
	return api$1.isValid(normalizeValue(version));
}
function isStable(version) {
	if (!api$1.isStable(version)) return false;
	const schedule = findScheduleForVersion(version);
	if (!schedule) return false;
	let ltsStart = schedule.lts;
	if (schedule.alpha) ltsStart = schedule.maintenance;
	if (!ltsStart) return false;
	return DateTime.local() > DateTime.fromISO(ltsStart);
}
function matches(version, range) {
	return api$1.matches(version, normalizeValue(range));
}
function getSatisfyingVersion(versions, range) {
	return api$1.getSatisfyingVersion(versions, normalizeValue(range));
}
function minSatisfyingVersion(versions, range) {
	return api$1.minSatisfyingVersion(versions, normalizeValue(range));
}
const api = {
	...api$1,
	isStable,
	getNewValue,
	isValid,
	matches,
	getSatisfyingVersion,
	minSatisfyingVersion,
	allowUnstableMajorUpgrades: true
};
//#endregion
export { api, api as default, getSatisfyingVersion, id, isStable, isValid, matches, minSatisfyingVersion };

//# sourceMappingURL=index.js.map