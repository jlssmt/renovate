import { regEx } from "../../../util/regex.js";
//#region lib/modules/versioning/semver/common.ts
const SEMVER_X_RANGE = [
	"*",
	"x",
	"X",
	""
];
const RANGE_SEPARATOR = regEx(/(?<separator>\s+|,|\|\||[()])/);
const NUMERIC_RELEASE_PART = "(?:0|[1-9]\\d*)";
const RELEASE_PART = `(?:${NUMERIC_RELEASE_PART}|[xX*])`;
const PRERELEASE_IDENTIFIER = `(?:${NUMERIC_RELEASE_PART}|\\d*[A-Za-z-][0-9A-Za-z-]*)`;
const BUILD_IDENTIFIER = "[0-9A-Za-z-]+";
const LEGACY_X_RANGE = regEx(`^((?:\\^|~|>=|<=|>|<|=)?\\s*v?)(${RELEASE_PART}(?:\\.${RELEASE_PART})+)(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?(?:\\+${BUILD_IDENTIFIER}(?:[.+]${BUILD_IDENTIFIER})*)?$`);
const NUMERIC_RELEASE_PART_RE = regEx(`^${NUMERIC_RELEASE_PART}$`);
/**
* https://docs.npmjs.com/cli/v6/using-npm/semver#x-ranges-12x-1x-12-
*/
function isSemVerXRange(range) {
	return SEMVER_X_RANGE.includes(range);
}
function isSemVerNumericPart(part) {
	return NUMERIC_RELEASE_PART_RE.test(part);
}
function normalizeLegacyXRangeToken(input) {
	const match = LEGACY_X_RANGE.exec(input);
	if (!match) return input;
	const [, operator, release] = match;
	const parts = release.split(".");
	if (parts.length > 3) return input;
	const xRangeIndex = parts.findIndex(isSemVerXRange);
	if (xRangeIndex === -1) return input;
	if (!parts.slice(xRangeIndex + 1).some(isSemVerNumericPart)) return input;
	return `${operator}${parts.slice(0, xRangeIndex + 1).join(".")}`;
}
function normalizeLegacyXRanges(input) {
	return input.split(RANGE_SEPARATOR).map(normalizeLegacyXRangeToken).join("");
}
//#endregion
export { isSemVerXRange, normalizeLegacyXRanges };

//# sourceMappingURL=common.js.map