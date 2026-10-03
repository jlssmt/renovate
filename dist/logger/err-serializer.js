import { regEx } from "../util/regex.js";
import prepareError from "./utils.js";
import { isString } from "@sindresorhus/is";
//#region lib/logger/err-serializer.ts
Error.stackTraceLimit = 20;
function errSerializer(err) {
	const response = prepareError(err);
	for (const field of [
		"message",
		"stack",
		"stdout",
		"stderr"
	]) {
		const val = response[field];
		if (isString(val)) response[field] = val.replace(regEx(/https:\/\/[^@]*?@/g), "https://**redacted**@");
	}
	return response;
}
//#endregion
export { errSerializer as default };

//# sourceMappingURL=err-serializer.js.map