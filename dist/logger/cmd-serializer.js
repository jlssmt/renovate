import { regEx } from "../util/regex.js";
import { isString } from "@sindresorhus/is";
//#region lib/logger/cmd-serializer.ts
function cmdSerializer(cmd) {
	if (isString(cmd)) return cmd.replace(regEx(/https:\/\/[^@]*@/g), "https://**redacted**@");
	return cmd;
}
//#endregion
export { cmdSerializer as default };

//# sourceMappingURL=cmd-serializer.js.map