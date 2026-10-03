import { isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
import { z } from "zod/v4";
//#region lib/util/timestamp.ts
const timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4;
const millenium = 9466848e5;
const tomorrowOffset = 864e5;
function isValid(date) {
	if (!date.isValid) return false;
	const tomorrow = DateTime.now().toMillis() + tomorrowOffset;
	const ts = date.toMillis();
	return ts > millenium && ts < tomorrow;
}
function asTimestamp(input) {
	if (input instanceof Date) {
		const date = DateTime.fromJSDate(input, { zone: "UTC" });
		if (isValid(date)) return date.toISO();
		return null;
	}
	if (typeof input === "number") {
		const millisDate = DateTime.fromMillis(input, { zone: "UTC" });
		if (isValid(millisDate)) return millisDate.toISO();
		const secondsDate = DateTime.fromSeconds(input, { zone: "UTC" });
		if (isValid(secondsDate)) return secondsDate.toISO();
		return null;
	}
	if (isString(input)) {
		const isoDate = DateTime.fromISO(input, { zone: "UTC" });
		if (isValid(isoDate)) return isoDate.toISO();
		const httpDate = DateTime.fromHTTP(input, { zone: "UTC" });
		if (isValid(httpDate)) return httpDate.toISO();
		const sqlDate = DateTime.fromSQL(input, { zone: "UTC" });
		if (isValid(sqlDate)) return sqlDate.toISO();
		const numberLikeDate = DateTime.fromFormat(input, "yyyyMMddHHmmss", { zone: "UTC" });
		if (isValid(numberLikeDate)) return numberLikeDate.toISO();
		const numberLikeOffsetDate = DateTime.fromFormat(input, "yyyyMMddHHmmssZZZ", { zone: "UTC" });
		if (isValid(numberLikeOffsetDate)) return numberLikeOffsetDate.toISO();
		const fallbackDate = DateTime.fromMillis(Date.parse(input) - timezoneOffset, { zone: "UTC" });
		if (isValid(fallbackDate)) return fallbackDate.toISO();
		return null;
	}
	return null;
}
const Timestamp = z.unknown().transform((input, ctx) => {
	const timestamp = asTimestamp(input);
	if (!timestamp) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "Invalid timestamp"
		});
		return z.NEVER;
	}
	return timestamp;
});
const MaybeTimestamp = Timestamp.nullable().catch(null);
//#endregion
export { MaybeTimestamp, Timestamp, asTimestamp };

//# sourceMappingURL=timestamp.js.map