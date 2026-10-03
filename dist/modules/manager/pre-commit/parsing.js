import { hasKey } from "../../../util/object.js";
import { isObject } from "@sindresorhus/is";
//#region lib/modules/manager/pre-commit/parsing.ts
/**
* Type guard to determine whether the file matches pre-commit configuration format
* Example original yaml:
*
*   repos
*   - repo: https://github.com/user/repo
*     rev: v1.0.0
*/
function matchesPrecommitConfigHeuristic(data) {
	return !!(isObject(data) && hasKey("repos", data));
}
/**
* Type guard to determine whether a given repo definition defines a pre-commit Git hook dependency.
* Example original yaml portion
*
*   - repo: https://github.com/user/repo
*     rev: v1.0.0
*/
function matchesPrecommitDependencyHeuristic(data) {
	return !!(isObject(data) && hasKey("repo", data) && hasKey("rev", data));
}
//#endregion
export { matchesPrecommitConfigHeuristic, matchesPrecommitDependencyHeuristic };

//# sourceMappingURL=parsing.js.map