import { regEx } from "../../../util/regex.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isString } from "@sindresorhus/is";
import later from "@breejs/later";
//#region lib/config/migrations/custom/schedule-migration.ts
const shortHoursRegex = regEx(/(?<hours> \d?\d)(?<meridiem>(?:a|p)m)/g);
const afterBeforeRegex = regEx(/^(?<pre>.*?)(?<afterBefore1>after|before) (?<mid1>.*?) and (?<afterBefore2>after|before) (?<mid2>.*?)(?: |$)(?<rest>.*)/);
const dayRegex1 = regEx(/every (?:mon|tues|wednes|thurs|fri|satur|sun)day$/);
const dayRegex2 = regEx(/every (?<day>[a-z]*day)$/);
var ScheduleMigration = class extends AbstractMigration {
	propertyName = "schedule";
	run(value) {
		if (value) {
			let schedules = [];
			if (isString(value)) schedules = [value];
			if (isArray(value)) schedules = [...value];
			const schedulesLength = schedules.length;
			for (let i = 0; i < schedulesLength; i += 1) if (schedules[i].includes(" and ") && schedules[i].includes("before ") && schedules[i].includes("after ")) {
				const parsedSchedule = later.parse.text(schedules[i].replace(shortHoursRegex, "$<hours>:00$<meridiem>")).schedules[0];
				if (!parsedSchedule?.t_a || !parsedSchedule.t_b) continue;
				if (parsedSchedule.t_a[0] > parsedSchedule.t_b[0]) {
					const toSplit = schedules[i];
					schedules[i] = toSplit.replace(afterBeforeRegex, "$<pre>$<afterBefore1> $<mid1> $<rest>").trim();
					schedules.push(toSplit.replace(afterBeforeRegex, "$<pre>$<afterBefore2> $<mid2> $<rest>").trim());
				}
			}
			for (let i = 0; i < schedules.length; i += 1) {
				if (schedules[i].includes("on the last day of the month")) schedules[i] = schedules[i].replace("on the last day of the month", "on the first day of the month");
				if (schedules[i].includes("on every weekday")) schedules[i] = schedules[i].replace("on every weekday", "every weekday");
				if (schedules[i].endsWith(" every day")) schedules[i] = schedules[i].replace(" every day", "");
				if (dayRegex1.test(schedules[i])) schedules[i] = schedules[i].replace(dayRegex2, "on $<day>");
				if (schedules[i].endsWith("days")) schedules[i] = schedules[i].replace("days", "day");
			}
			if (isString(value) && schedules.length === 1) this.rewrite(schedules[0]);
			else this.rewrite(schedules);
		}
	}
};
//#endregion
export { ScheduleMigration };

//# sourceMappingURL=schedule-migration.js.map