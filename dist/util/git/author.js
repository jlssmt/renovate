import { regEx } from "../regex.js";
import { logger } from "../../logger/index.js";
import addrs from "email-addresses";
//#region lib/util/git/author.ts
function parseGitAuthor(input) {
	let result = null;
	if (!input) return null;
	try {
		result = addrs.parseOneAddress(input);
		if (result) return result;
		let massagedInput;
		let massagedBotEmail = false;
		if (input.includes("<") && input.includes(">")) massagedInput = `"${input.replace(regEx(/(?<sep>\s?<)/), "\"$<sep>")}`;
		if (input.includes("[bot]@")) {
			massagedInput = (massagedInput ?? input).replace("[bot]@", "@");
			massagedBotEmail = true;
		}
		if (!massagedInput) return null;
		const parsed = addrs.parseOneAddress(massagedInput);
		if (parsed?.address) {
			result = {
				name: parsed.name ?? input.replace(regEx(/@.*/), ""),
				address: parsed.address
			};
			if (massagedBotEmail) result.address = result.address?.replace("@", "[bot]@");
			return result;
		}
	} catch (err) {
		logger.debug({ err }, "Unknown error parsing gitAuthor");
	}
	return null;
}
//#endregion
export { parseGitAuthor };

//# sourceMappingURL=author.js.map