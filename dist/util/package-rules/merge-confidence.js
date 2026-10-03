import { MISSING_API_CREDENTIALS } from "../../constants/error-messages.js";
import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { getApiToken } from "../merge-confidence/index.js";
import { Matcher } from "./base.js";
import { isArray, isNonEmptyString, isNullOrUndefined, isUndefined } from "@sindresorhus/is";
//#region lib/util/package-rules/merge-confidence.ts
var MergeConfidenceMatcher = class extends Matcher {
	matches({ mergeConfidenceLevel }, { matchConfidence }) {
		if (isNullOrUndefined(matchConfidence)) return null;
		if (GlobalConfig.get("platform") === "local") {
			logger.once.debug("Skipping packageRule(s) with `matchConfidence`, as we're running in platform=local");
			return null;
		}
		if (isUndefined(getApiToken())) {
			const error = new Error(MISSING_API_CREDENTIALS);
			error.validationSource = "MatchConfidence Authenticator";
			error.validationError = "Missing credentials";
			error.validationMessage = `The \`matchConfidence\` matcher in \`packageRules\` requires authentication. Please refer to the [documentation](${GlobalConfig.get("productLinks").documentation}configuration-options/#packagerulesmatchconfidence) and add the required host rule.`;
			throw error;
		}
		return isArray(matchConfidence) && isNonEmptyString(mergeConfidenceLevel) && matchConfidence.includes(mergeConfidenceLevel);
	}
};
//#endregion
export { MergeConfidenceMatcher };

//# sourceMappingURL=merge-confidence.js.map