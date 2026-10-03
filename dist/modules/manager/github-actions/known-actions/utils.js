import { regEx } from "../../../../util/regex.js";
import { id } from "../../../versioning/semver-partial/index.js";
import { splitImageParts } from "../../dockerfile/extract.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/utils.ts
function actionSchema(name, { withSchema, ...cfg }) {
	return z.object({
		uses: matchAction(name),
		with: withSchema ?? VersionVal
	}).transform(({ with: deps }) => deps.map((dep) => {
		const merged = {
			...cfg,
			...dep
		};
		merged.depName ??= merged.packageName;
		return merged;
	}));
}
function matchAction(action) {
	return z.string().regex(regEx(`(?:https?://[^/]+/)?${RegExp.escape(action)}(?:@.+)?$`));
}
function parseValue(currentValue, isInvalid) {
	if (!currentValue) return {
		skipStage: "extract",
		skipReason: "unspecified-version",
		depType: "uses-with"
	};
	if (isInvalid?.(currentValue) === true) return {
		skipStage: "extract",
		skipReason: "invalid-version",
		depType: "uses-with",
		currentValue
	};
	return {
		currentValue,
		depType: "uses-with"
	};
}
const partialVersionRegex = regEx(/^v?\d+(?:\.\d+)?$/);
/**
* Whether the value is a whole major (`21`) or major.minor (`3.3`) version,
* optionally `v`-prefixed (`v2.5`).
*/
function isPartialVersion(value) {
	return partialVersionRegex.test(value);
}
/**
* As `parseValue`, for inputs where a partial version means "the latest
* release of that line" rather than a pinned version.
*
* Renovate's default versionings treat a partial version as pinned, and so
* replace it with a full-precision one (e.g. `3.3` -> `3.3.6`), which drops
* the rolling behaviour the workflow asked for. `semver-partial` versioning
* keeps the value's precision instead (`3.3` -> `3.4`).
*/
function parsePartialValue(currentValue, isInvalid) {
	const dep = parseValue(currentValue, isInvalid);
	if (currentValue && !dep.skipReason && isPartialVersion(currentValue)) dep.versioning = id;
	return dep;
}
/**
* A single dependency, versioned by the given `with:` input.
*
* @param isInvalid should return `true` if the version is invalid and should be skipped
*/
function valSchema(key, isInvalid) {
	return z.object({ [key]: z.string().optional() }).transform((val) => [parseValue(val[key], isInvalid)]);
}
/**
* As `valSchema`, for inputs which accept a partial version.
*/
function partialValSchema(key, isInvalid) {
	return z.object({ [key]: z.string().optional() }).transform((val) => [parsePartialValue(val[key], isInvalid)]);
}
const VersionVal = valSchema("version");
function parseImageValue(image) {
	if (!image) return {
		depType: "uses-with",
		skipStage: "extract",
		skipReason: "unspecified-version"
	};
	const dep = splitImageParts(image);
	return {
		depType: "uses-with",
		...dep,
		...dep.skipReason ? { skipStage: "extract" } : {}
	};
}
const actionsVersionsExtractVersion = "^(?<version>\\d+\\.\\d+\\.\\d+)(-\\d+)?$";
//#endregion
export { VersionVal, actionSchema, actionsVersionsExtractVersion, isPartialVersion, matchAction, parseImageValue, parsePartialValue, parseValue, partialValSchema, valSchema };

//# sourceMappingURL=utils.js.map