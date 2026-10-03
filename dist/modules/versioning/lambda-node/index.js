import { api as api$1 } from "../node/index.js";
import { findLambdaScheduleForVersion } from "./schedule.js";
import { isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/modules/versioning/lambda-node/index.ts
const id = "lambda-node";
function isStable(version) {
	const schedule = findLambdaScheduleForVersion(version);
	if (schedule === null) return false;
	if (isString(schedule.support)) return DateTime.local() < DateTime.fromISO(schedule.support);
	return true;
}
const api = {
	...api$1,
	isStable
};
//#endregion
export { api, api as default, id, isStable };

//# sourceMappingURL=index.js.map