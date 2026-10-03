import { GlobalConfig } from "../../config/global.js";
import { logger } from "../../logger/index.js";
import { isNumber } from "@sindresorhus/is";
import upath from "upath";
import { parse } from "editorconfig";
//#region lib/util/json-writer/editor-config.ts
var EditorConfig = class EditorConfig {
	static async getCodeFormat(fileName) {
		const localDir = GlobalConfig.get("localDir");
		try {
			const knownProps = await parse(upath.join(localDir, fileName));
			return {
				indentationSize: EditorConfig.getIndentationSize(knownProps),
				indentationType: EditorConfig.getIndentationType(knownProps),
				maxLineLength: knownProps.max_line_length
			};
		} catch (err) {
			logger.warn({ err }, "Failed to parse editor config");
			return {};
		}
	}
	static getIndentationType(knownProps) {
		const { indent_style: indentStyle } = knownProps;
		if (indentStyle === "tab") return "tab";
		if (indentStyle === "space") return "space";
	}
	static getIndentationSize(knownProps) {
		const { indent_size: indentSize } = knownProps;
		if (isNumber(indentSize) && Number.isInteger(indentSize)) return indentSize;
	}
};
//#endregion
export { EditorConfig };

//# sourceMappingURL=editor-config.js.map