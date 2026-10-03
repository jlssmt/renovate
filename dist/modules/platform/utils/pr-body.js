import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { emojify } from "../../../util/emoji.js";
//#region lib/modules/platform/utils/pr-body.ts
const re = regEx(`(?<preNotes>.*### Release Notes)(?<releaseNotes>.*)### Configuration(?<postNotes>.*)`, "s");
function smartTruncate(input, len) {
	if (input.length < len) return input;
	logger.debug(`Truncating PR body due to platform limitation of ${len} characters`);
	const note = emojify(`> :information_source: **Note**\n> \n> This PR body was truncated due to platform limits.\n\n`);
	const truncationNotice = emojify(`\n\n> :exclamation: **Important**\n> \n> :scissors: PR body was truncated to here.\n`);
	const truncatedInput = note + input;
	const reMatch = re.exec(truncatedInput);
	if (!reMatch?.groups) {
		if (truncationNotice.length >= len) return truncatedInput.substring(0, len);
		return truncatedInput.substring(0, len - truncationNotice.length) + truncationNotice;
	}
	const divider = `\n\n</details>\n\n---\n\n### Configuration`;
	const preNotes = reMatch.groups.preNotes;
	const releaseNotes = reMatch.groups.releaseNotes;
	const postNotes = reMatch.groups.postNotes;
	const availableLength = len - (preNotes.length + postNotes.length + divider.length + truncationNotice.length);
	if (availableLength <= 0) {
		if (truncationNotice.length >= len) return truncatedInput.substring(0, len);
		return truncatedInput.substring(0, len - truncationNotice.length) + truncationNotice;
	}
	return preNotes + releaseNotes.slice(0, availableLength) + truncationNotice + divider + postNotes;
}
//#endregion
export { smartTruncate };

//# sourceMappingURL=pr-body.js.map