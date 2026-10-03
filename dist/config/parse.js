import { regEx } from "../util/regex.js";
import { logger } from "../logger/index.js";
import { parseJson } from "../util/common.js";
import JSON5 from "json5";
import upath from "upath";
import stripJsonComments from "strip-json-comments";
import jsonValidator from "json-dup-key-validator";
//#region lib/config/parse.ts
function parseFileConfig(fileName, fileContents) {
	if (upath.extname(fileName) === ".json5") try {
		return {
			success: true,
			parsedContents: JSON5.parse(fileContents)
		};
	} catch (err) {
		logger.debug({
			fileName,
			fileContents
		}, "Error parsing JSON5 file");
		return {
			success: false,
			validationError: "Invalid JSON5 (parsing failed)",
			validationMessage: `JSON5.parse error: \`${err.message.replaceAll("`", "'")}\``
		};
	}
	else {
		const jsonString = stripJsonComments(fileContents).replace(regEx(/,(?<trailing>\s*[}\]])/g), "$<trailing>");
		let allowDuplicateKeys = true;
		let jsonValidationError = jsonValidator.validate(jsonString, allowDuplicateKeys);
		if (jsonValidationError) return {
			success: false,
			validationError: "Invalid JSON (parsing failed)",
			validationMessage: jsonValidationError
		};
		allowDuplicateKeys = false;
		jsonValidationError = jsonValidator.validate(jsonString, allowDuplicateKeys);
		if (jsonValidationError) return {
			success: false,
			validationError: "Duplicate keys in JSON",
			validationMessage: JSON.stringify(jsonValidationError)
		};
		try {
			return {
				success: true,
				parsedContents: parseJson(fileContents, fileName)
			};
		} catch (err) {
			logger.debug({ fileContents }, "Error parsing renovate config");
			return {
				success: false,
				validationError: "Invalid JSON (parsing failed)",
				validationMessage: `JSON.parse error:  \`${err.message.replaceAll("`", "'")}\``
			};
		}
	}
}
//#endregion
export { parseFileConfig };

//# sourceMappingURL=parse.js.map