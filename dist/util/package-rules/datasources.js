import { matchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/datasources.ts
var DatasourcesMatcher = class extends Matcher {
	matches({ datasource }, { matchDatasources }) {
		if (isUndefined(matchDatasources)) return null;
		if (isUndefined(datasource)) return false;
		return matchRegexOrGlobList(datasource, matchDatasources);
	}
};
//#endregion
export { DatasourcesMatcher };

//# sourceMappingURL=datasources.js.map