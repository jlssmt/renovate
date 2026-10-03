import { coerceObject } from "../object.js";
import { getCustomEnv, getUserEnv } from "../env.js";
import { getChildProcessEnv } from "./env.js";
import { isBoolean, isNonEmptyStringAndNotWhitespace, isObject, isString } from "@sindresorhus/is";
import { join } from "shlex";
//#region lib/util/exec/utils.ts
function getChildEnv({ extraEnv, env: forcedEnv = {} } = {}) {
	const globalConfigEnv = getCustomEnv();
	const userConfiguredEnv = getUserEnv();
	const inheritedKeys = [];
	for (const [key, val] of Object.entries(coerceObject(extraEnv))) if (isString(val)) inheritedKeys.push(key);
	const parentEnv = getChildProcessEnv(inheritedKeys);
	const combinedEnv = {
		...extraEnv,
		...parentEnv,
		...globalConfigEnv,
		...userConfiguredEnv,
		...forcedEnv
	};
	const result = {};
	for (const [key, val] of Object.entries(combinedEnv)) if (isString(val)) result[key] = `${val}`;
	return result;
}
function isCommandWithOptions(cmd) {
	if (!(isObject(cmd) && "command" in cmd)) return false;
	if (!Array.isArray(cmd.command)) return false;
	if (!cmd.command.length) return false;
	if (cmd.command.some((v) => !isString(v))) return false;
	if ("ignoreFailure" in cmd && !isBoolean(cmd.ignoreFailure)) return false;
	if ("shell" in cmd && !(isBoolean(cmd.shell) || isNonEmptyStringAndNotWhitespace(cmd.shell))) return false;
	return true;
}
function asRawCommand(cmd) {
	if (isCommandWithOptions(cmd)) return join(cmd.command);
	return cmd;
}
//#endregion
export { asRawCommand, getChildEnv, isCommandWithOptions };

//# sourceMappingURL=utils.js.map