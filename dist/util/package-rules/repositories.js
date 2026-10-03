import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/repositories.ts
var RepositoriesMatcher = class extends Matcher {
	matches({ repository }, { matchRepositories }) {
		if (isUndefined(matchRepositories)) return null;
		if (isUndefined(repository)) return false;
		return matchRegexOrGlobList(repository, matchRepositories);
	}
};
//#endregion
export { RepositoriesMatcher };

//# sourceMappingURL=repositories.js.map