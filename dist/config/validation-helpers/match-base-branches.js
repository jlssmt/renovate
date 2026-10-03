import { ConfigValidationTopic } from "./types.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/config/validation-helpers/match-base-branches.ts
/**
* Only if type condition or context condition violated then errors array will be mutated to store metadata
*/
function check({ resolvedRule, currentPath, baseBranchPatterns }) {
	const warnings = [];
	if (Array.isArray(resolvedRule.matchBaseBranches) && !isNonEmptyArray(baseBranchPatterns)) warnings.push({
		topic: ConfigValidationTopic.Error,
		message: `${currentPath}: You must configure baseBranchPatterns in order to use them inside matchBaseBranches.`
	});
	return warnings;
}
//#endregion
export { check };

//# sourceMappingURL=match-base-branches.js.map