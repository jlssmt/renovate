import { isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/util/date.ts
const ONE_MINUTE_MS = 6e4;
function getElapsedDays(timestamp, floor = true) {
	const currentVersionTimestampDate = DateTime.fromISO(timestamp);
	const diffInDays = DateTime.now().diff(currentVersionTimestampDate, "days").as("days");
	if (floor) return Math.floor(diffInDays);
	return diffInDays;
}
function getElapsedMinutes(date) {
	return Math.floor(((/* @__PURE__ */ new Date()).getTime() - date.getTime()) / ONE_MINUTE_MS);
}
function getElapsedHours(date) {
	const pastDate = isString(date) ? DateTime.fromISO(date) : DateTime.fromJSDate(date);
	if (!pastDate.isValid) return 0;
	const diff = DateTime.now().diff(pastDate, "hours");
	return Math.floor(diff.hours);
}
function getElapsedMs(timestamp) {
	return (/* @__PURE__ */ new Date()).getTime() - new Date(timestamp).getTime();
}
//#endregion
export { getElapsedDays, getElapsedHours, getElapsedMinutes, getElapsedMs };

//# sourceMappingURL=date.js.map