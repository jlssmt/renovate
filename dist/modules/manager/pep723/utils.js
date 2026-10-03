import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { Pep723 } from "./schema.js";
//#region lib/modules/manager/pep723/utils.ts
const regex = regEx(/^# \/\/\/ (?<type>[a-zA-Z0-9-]+)$\s(?<content>(?:^#(?:| .*)$\s)+)^# \/\/\/$/, "m");
function extractPep723(content, packageFile) {
	const matchedContent = regex.exec(content)?.groups?.content;
	if (!matchedContent) return null;
	const parsedToml = matchedContent.split(newlineRegex).map((line) => line.substring(line.startsWith("# ") ? 2 : 1)).join("\n");
	const { data: res, error } = Pep723.safeParse(parsedToml);
	if (error) {
		logger.debug({
			packageFile,
			err: error
		}, `Error parsing PEP 723 inline script metadata`);
		return null;
	}
	return res.deps.length ? res : null;
}
//#endregion
export { extractPep723 };

//# sourceMappingURL=utils.js.map