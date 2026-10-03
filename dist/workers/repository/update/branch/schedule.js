import { logger } from "../../../../logger/index.js";
import { fixShortHours } from "../../../../config/migration.js";
import { isArray } from "@sindresorhus/is";
import { DateTime } from "luxon";
import later from "@breejs/later";
import { Cron, CronPattern } from "croner";
import cronstrue from "cronstrue";
//#region lib/workers/repository/update/branch/schedule.ts
const scheduleMappings = {
	"every month": "before 5am on the first day of the month",
	monthly: "before 5am on the first day of the month"
};
const minutesChar = "*";
function parseCron(scheduleText) {
	try {
		return new CronPattern(scheduleText);
	} catch {
		return;
	}
}
function hasValidTimezone(timezone) {
	if (!DateTime.local().setZone(timezone).isValid) return [false, `Invalid schedule: Unsupported timezone ${timezone}`];
	return [true];
}
function hasValidSchedule(schedule) {
	let message = "";
	if (!schedule || schedule === "at any time" || schedule[0] === "at any time") return [true];
	if (schedule.some((scheduleText) => {
		const parsedCron = parseCron(scheduleText);
		if (parsedCron !== void 0) {
			if (parsedCron.minute.filter((v) => v !== 1).length !== 0 || !scheduleText.startsWith(minutesChar)) {
				message = `Invalid schedule: "${scheduleText}" has cron syntax, but doesn't have * as minutes`;
				return true;
			}
			return false;
		}
		const massagedText = fixShortHours(scheduleMappings[scheduleText] || scheduleText);
		const parsedSchedule = later.parse.text(massagedText);
		if (parsedSchedule.error !== -1) {
			message = `Invalid schedule: Failed to parse "${scheduleText}"`;
			return true;
		}
		if (parsedSchedule.schedules.some((s) => s.m)) {
			message = `Invalid schedule: "${scheduleText}" should not specify minutes`;
			return true;
		}
		if (!parsedSchedule.schedules.some((s) => !!s.M || s.d !== void 0 || !!s.D || s.t_a !== void 0 || !!s.t_b)) {
			message = `Invalid schedule: "${scheduleText}" has no months, days of week or time of day`;
			return true;
		}
		return false;
	})) return [false, message];
	return [true];
}
function cronMatches(cron, now, timezone) {
	const parsedCron = new Cron(cron, {
		...timezone && { timezone },
		domAndDow: true
	});
	// istanbul ignore if
	if (!parsedCron) return false;
	const nowMinute = now.startOf("minute");
	const probe = nowMinute.minus({ milliseconds: 1 });
	const nextRun = parsedCron.nextRun(probe.toJSDate());
	// istanbul ignore if: should not happen
	if (!nextRun) {
		logger.warn({ schedule: cron }, "Invalid cron schedule. No next run is possible");
		return false;
	}
	return DateTime.fromJSDate(nextRun).startOf("minute").toMillis() === nowMinute.toMillis();
}
function isScheduledNow(config, scheduleKey = "schedule") {
	let configSchedule = config[scheduleKey];
	logger.debug(`Checking schedule(schedule=${String(configSchedule)}, tz=${config.timezone}, now=${DateTime.utc().toISO()})`);
	if (!configSchedule || configSchedule.length === 0 || configSchedule[0] === "" || configSchedule[0] === "at any time") {
		logger.debug("No schedule defined");
		return true;
	}
	if (!isArray(configSchedule)) {
		logger.warn({ schedule: configSchedule }, "config schedule is not an array");
		configSchedule = [configSchedule];
	}
	const validSchedule = hasValidSchedule(configSchedule);
	if (!validSchedule[0]) {
		logger.warn(validSchedule[1]);
		return true;
	}
	let now = DateTime.local();
	logger.trace(`now=${now.toISO()}`);
	if (config.timezone) {
		logger.debug(`Found timezone: ${config.timezone}`);
		const validTimezone = hasValidTimezone(config.timezone);
		if (!validTimezone[0]) {
			logger.warn(validTimezone[1]);
			return true;
		}
		logger.debug("Adjusting now for timezone");
		now = now.setZone(config.timezone);
		logger.trace(`now=${now.toISO()}`);
	}
	const currentDay = now.weekday;
	logger.trace(`currentDay=${currentDay}`);
	const currentSeconds = now.startOf("second").diff(now.startOf("day"), "seconds").seconds;
	logger.trace(`currentSeconds=${currentSeconds}`);
	logger.debug(`Checking ${configSchedule.length} schedule(s)`);
	const jsNow = now.setZone("utc", { keepLocalTime: true }).toJSDate();
	if (!configSchedule.some((scheduleText) => {
		if (parseCron(scheduleText)) {
			const cronScheduleSummary = cronstrue.toString(scheduleText, { throwExceptionOnParseError: false });
			logger.debug(`Human-readable summary for cron:: ${cronScheduleSummary}`);
			if (cronMatches(scheduleText, now, config.timezone)) {
				logger.debug(`Matches schedule ${scheduleText}`);
				return true;
			}
		} else {
			const massagedText = scheduleMappings[scheduleText] || scheduleText;
			const parsedSchedule = later.parse.text(fixShortHours(massagedText));
			logger.debug({ parsedSchedule }, `Checking schedule "${scheduleText}"`);
			if (later.schedule(parsedSchedule).isValid(jsNow)) {
				logger.debug(`Matches schedule ${scheduleText}`);
				return true;
			}
		}
		return false;
	})) {
		logger.debug("Package not scheduled");
		return false;
	}
	return true;
}
//#endregion
export { cronMatches, hasValidSchedule, hasValidTimezone, isScheduledNow };

//# sourceMappingURL=schedule.js.map