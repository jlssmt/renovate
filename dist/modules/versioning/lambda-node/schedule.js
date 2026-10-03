import { regEx } from "../../../util/regex.js";
import data from "../../../data-files.generated.js";
import { isStable } from "../node/index.js";
//#region lib/modules/versioning/lambda-node/schedule.ts
const lambdaSchedule = JSON.parse(data.get("data/lambda-node-js-schedule.json"));
function findLambdaScheduleForVersion(version) {
	const majorVersionMatch = regEx(/^v?(?<major>[0-9]+)\./).exec(version);
	if (!majorVersionMatch) return null;
	if (!isStable(version)) return null;
	return lambdaSchedule[majorVersionMatch.groups.major] ?? null;
}
//#endregion
export { findLambdaScheduleForVersion };

//# sourceMappingURL=schedule.js.map