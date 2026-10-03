import { matchRegexOrGlobList } from "../string-match.js";
import { isCustomManager } from "../../modules/manager/custom/index.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/managers.ts
var ManagersMatcher = class extends Matcher {
	matches({ manager }, { matchManagers }) {
		if (isUndefined(matchManagers)) return null;
		if (isUndefined(manager) || !manager) return false;
		if (isCustomManager(manager)) return matchRegexOrGlobList(`custom.${manager}`, matchManagers);
		return matchRegexOrGlobList(manager, matchManagers);
	}
};
//#endregion
export { ManagersMatcher };

//# sourceMappingURL=managers.js.map