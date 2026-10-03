import { regEx } from "../../util/regex.js";
import { fromBase64 } from "../../util/string.js";
import { logger } from "../../logger/index.js";
import { toSha256 } from "../../util/hash.js";
import { stripEmojis } from "../../util/emoji.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/modules/platform/pr-body.ts
const prDebugDataRe = regEx(/\n?<!--renovate-debug:(?<payload>.*?)-->\n?/);
const renovateConfigHashRe = regEx(/\n?<!--renovate-config-hash:(?<payload>.*?)-->\n?/);
const prCheckboxRe = regEx(/- (?<checkbox>\[[\sx]]) <!-- rebase-check -->/);
function noWhitespaceOrHeadings(input) {
	return input.replace(regEx(/\r?\n|\r|\s|#/g), "");
}
const reviewableRegex = regEx(/\s*<!-- Reviewable:start -->/);
function hashBody(body) {
	let result = body?.trim() ?? "";
	result = result.replace(prDebugDataRe, "");
	const reviewableIndex = result.search(reviewableRegex);
	if (reviewableIndex > -1) result = result.slice(0, reviewableIndex);
	result = stripEmojis(result);
	result = noWhitespaceOrHeadings(result);
	result = toSha256(result);
	return result;
}
function isRebaseRequested(body) {
	const match = prCheckboxRe.exec(body);
	if (!match) return;
	return match.groups?.checkbox === "[x]";
}
function getRenovateDebugPayload(body) {
	return prDebugDataRe.exec(body)?.groups?.payload;
}
function getRenovateConfigHashPayload(body) {
	return renovateConfigHashRe.exec(body)?.groups?.payload;
}
function getPrBodyStruct(input) {
	const body = input ?? "";
	const result = { hash: hashBody(body) };
	const rebaseRequested = isRebaseRequested(body);
	if (!isUndefined(rebaseRequested)) result.rebaseRequested = rebaseRequested;
	const rawConfigHash = getRenovateConfigHashPayload(body);
	if (rawConfigHash) result.rawConfigHash = rawConfigHash;
	const debugPayload = getRenovateDebugPayload(body);
	if (debugPayload) try {
		result.debugData = JSON.parse(fromBase64(debugPayload));
	} catch {
		logger.warn("Unable to read and parse debugData from the PR");
	}
	return result;
}
//#endregion
export { getPrBodyStruct, getRenovateConfigHashPayload, getRenovateDebugPayload, hashBody, prDebugDataRe };

//# sourceMappingURL=pr-body.js.map