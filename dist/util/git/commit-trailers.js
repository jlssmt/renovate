import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import { isNonEmptyArray, isString } from "@sindresorhus/is";
//#region lib/util/git/commit-trailers.ts
const commitTrailerRe = regEx(/^[A-Za-z0-9-]+: [^\r\n]+$/);
/**
* A valid git trailer is a single-line `Key: value` entry where the key
* contains only letters, digits and `-`, and the value is non-empty.
*/
function isValidCommitTrailer(trailer) {
	return isString(trailer) && commitTrailerRe.test(trailer);
}
/**
* Keep only trailers that are valid single-line `Key: value` entries.
*/
function filterValidCommitTrailers(trailers) {
	const valid = [];
	const invalid = [];
	for (const trailer of trailers) if (isValidCommitTrailer(trailer)) valid.push(trailer);
	else invalid.push(trailer);
	if (isNonEmptyArray(invalid)) logger.warn({ invalid }, "Ignoring invalid commit trailers (must be a single-line Key: value)");
	return valid;
}
/**
* Build the full commit message with trailers as the final block.
* Paragraphs (message parts and the trailer block) are separated by blank
* lines, matching `git commit -m ... -m ...` behavior.
*/
function formatCommitMessage(message, trailers) {
	const parts = isString(message) ? [message] : [...message];
	if (isNonEmptyArray(trailers)) parts.push(trailers.join("\n"));
	return parts.join("\n\n");
}
//#endregion
export { filterValidCommitTrailers, formatCommitMessage, isValidCommitTrailer };

//# sourceMappingURL=commit-trailers.js.map