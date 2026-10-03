import { api } from "../semver/index.js";
import node_js_schedule_default from "../../../data/node-js-schedule.js";
//#region lib/modules/versioning/node/schedule.ts
const nodeSchedule = node_js_schedule_default;
const nodeCodenames = /* @__PURE__ */ new Map();
for (const version of Object.keys(nodeSchedule)) {
	const schedule = nodeSchedule[version];
	if (schedule.codename) nodeCodenames.set(schedule.codename.toUpperCase(), {
		version,
		...schedule
	});
}
function findScheduleForCodename(codename) {
	return nodeCodenames.get(codename?.toUpperCase());
}
function findScheduleForVersion(version) {
	const major = api.getMajor(version);
	return nodeSchedule[`v${major}`];
}
//#endregion
export { findScheduleForCodename, findScheduleForVersion };

//# sourceMappingURL=schedule.js.map