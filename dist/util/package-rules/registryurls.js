import { anyMatchRegexOrGlobList } from "../string-match.js";
import { Matcher } from "./base.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/registryurls.ts
var RegistryUrlsMatcher = class extends Matcher {
	matches({ registryUrls }, { matchRegistryUrls }) {
		if (isNullOrUndefined(matchRegistryUrls)) return null;
		if (isNullOrUndefined(registryUrls)) return false;
		return anyMatchRegexOrGlobList(registryUrls, matchRegistryUrls);
	}
};
//#endregion
export { RegistryUrlsMatcher };

//# sourceMappingURL=registryurls.js.map