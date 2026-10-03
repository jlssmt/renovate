import { regEx } from "./regex.js";
import { logger } from "../logger/index.js";
import { isNonEmptyString, isNumber } from "@sindresorhus/is";
import { DateTime } from "luxon";
import ms from "ms";
//#region lib/util/pretty-time.ts
const splitRegex = regEx(/(?<part>.*?[a-z]+)/);
function split(time) {
	return time.split(splitRegex).map((x) => x.trim()).filter(isNonEmptyString);
}
function applyCustomFormat(spec) {
	const monthRegex = regEx(/^(?<months>\d+)\s*(?:months?|M)$/);
	return spec.replace(monthRegex, (_, months) => `${months * 30} days`);
}
function toMs(time) {
	try {
		const specs = split(time).map(applyCustomFormat);
		if (!specs.length) {
			logger.debug({ time }, `Invalid time specifier: '${time}'`);
			return null;
		}
		let totalMillis = 0;
		for (const spec of specs) {
			const millis = ms(spec);
			if (!isNumber(millis)) {
				logger.debug({ time }, `Invalid time specifier: '${spec}'`);
				return null;
			}
			totalMillis += millis;
		}
		return totalMillis;
	} catch (err) {
		logger.debug({
			time,
			err
		}, `Invalid time specifier: '${time}'`);
		return null;
	}
}
const rangeRegex = regEx(/^(?<operator>>=|<=|<|>)\s*(?<age>.*)$/);
function satisfiesDateRange(date, range) {
	const grps = range.trim().match(rangeRegex)?.groups;
	if (!grps) return null;
	const { operator, age } = grps;
	const luxonDate = DateTime.fromISO(date, { zone: "utc" });
	if (!luxonDate.isValid) {
		logger.trace(`Invalid date when computing satisfiesDateRange: '${date}'`);
		return null;
	}
	const dateMs = luxonDate.toMillis();
	const ageMs = toMs(age);
	if (!isNumber(ageMs)) return null;
	const rangeMs = Date.now() - ageMs;
	switch (operator) {
		case ">": return dateMs < rangeMs;
		case ">=": return dateMs <= rangeMs;
		case "<": return dateMs > rangeMs;
		case "<=": return dateMs >= rangeMs;
	}
	// v8 ignore next: can never happen
	return null;
}
//#endregion
export { satisfiesDateRange, toMs };

//# sourceMappingURL=pretty-time.js.map