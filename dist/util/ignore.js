import { regEx } from "./regex.js";
import { logger } from "../logger/index.js";
//#region lib/util/ignore.ts
function isSkipComment(comment) {
	if (comment && regEx(/^(?:renovate|pyup):/).test(comment)) {
		const command = comment.split("#")[0].split(":")[1].trim();
		if (command === "ignore") return true;
		logger.debug(`Unknown comment command: ${command}`);
	}
	return false;
}
//#endregion
export { isSkipComment };

//# sourceMappingURL=ignore.js.map