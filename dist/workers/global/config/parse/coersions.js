import { regEx } from "../../../../util/regex.js";
import { isNonEmptyString } from "@sindresorhus/is";
import JSON5 from "json5";
//#region lib/workers/global/config/parse/coersions.ts
const coersions = {
	boolean: (val) => {
		if (val === "true" || val === "") return true;
		if (val === "false") return false;
		throw new Error(`Invalid boolean value: expected 'true' or 'false', but got '${val}'`);
	},
	array: (val) => {
		if (val === "") return [];
		try {
			return JSON5.parse(val);
		} catch {
			return val.split(",").map((el) => el.trim()).filter(isNonEmptyString);
		}
	},
	object: (val) => {
		if (val === "") return {};
		try {
			return JSON5.parse(val);
		} catch {
			throw new Error(`Invalid JSON value: '${val}'`);
		}
	},
	string: (val) => val.replace(regEx(/\\n/g), "\n"),
	integer: parseInt
};
//#endregion
export { coersions };

//# sourceMappingURL=coersions.js.map