import { regEx } from "../../util/regex.js";
//#region lib/config/options/env.ts
function getEnvName(option) {
	if (option.env === false) return "";
	if (option.env) return option.env;
	return `RENOVATE_${option.name.replace(regEx(/(?<upper>[A-Z])/g), "_$<upper>").toUpperCase()}`;
}
//#endregion
export { getEnvName };

//# sourceMappingURL=env.js.map