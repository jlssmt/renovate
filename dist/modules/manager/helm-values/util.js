import { hasKey } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { isObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/helm-values/util.ts
const parentKeyRe = regEx(/image$/i);
/**
* Type guard to determine whether a given partial Helm values.yaml object potentially
* defines a Helm Docker dependency.
*
* There is no exact standard of how Docker dependencies are defined in Helm
* values.yaml files (as of February 26th 2021), this function defines a
* heuristic based on the most commonly used format in the Helm charts:
*
* image:
*   repository: 'something'
*   tag: v1.0.0
* image:
*   repository: 'something'
*   version: v1.0.0
* renovateImage:
*   repository: 'something'
*   tag: v1.0.0
*/
function matchesHelmValuesDockerHeuristic(parentKey, data) {
	return !!(parentKeyRe.test(parentKey) && isObject(data) && hasKey("repository", data) && (hasKey("tag", data) || hasKey("version", data)));
}
function matchesHelmValuesInlineImage(parentKey, data) {
	return !!(parentKeyRe.test(parentKey) && data && isString(data));
}
/**
* Returns the version defined by a sibling `tag` or `version` key of the given
* object, if any:
*
* cli:
*   image: 'something'
*   tag: v1.0.0
* cli:
*   image: 'something'
*   version: v1.0.0
*/
function getHelmValuesSiblingVersion(data) {
	const { tag, version } = data;
	if (isString(tag) && tag) return tag;
	if (isString(version) && version) return version;
}
//#endregion
export { getHelmValuesSiblingVersion, matchesHelmValuesDockerHeuristic, matchesHelmValuesInlineImage };

//# sourceMappingURL=util.js.map