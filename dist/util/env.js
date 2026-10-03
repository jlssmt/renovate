import { get, set } from "./cache/memory/index.js";
import { coerceObject } from "./object.js";
//#region lib/util/env.ts
let customEnv = {};
function setCustomEnv(envObj) {
	customEnv = envObj;
}
function getCustomEnv() {
	return customEnv;
}
function setUserEnv(envObj) {
	set("userEnv", envObj);
}
function getUserEnv() {
	return coerceObject(get("userEnv"));
}
/**
* Combination of process.env, customEnvVariables and user configured env
*
* Precedence: userEnv > customEnvVariables > process.env
*/
function getEnv() {
	return {
		...process.env,
		...getCustomEnv(),
		...getUserEnv()
	};
}
//#endregion
export { getCustomEnv, getEnv, getUserEnv, setCustomEnv, setUserEnv };

//# sourceMappingURL=env.js.map