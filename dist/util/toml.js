import { regEx } from "./regex.js";
import { stripTemplates } from "./string.js";
import { getStaticTOMLValue, parseTOML } from "toml-eslint-parser";
//#region lib/util/toml.ts
function parseTOMLDocument(input) {
	return parseTOML(input, { tomlVersion: "1.1" });
}
function parse(input) {
	return getStaticTOMLValue(parseTOMLDocument(input));
}
function massage(input) {
	return stripTemplates(input.replace(regEx(/^\s*{{.+?}}\s*=.*$/gm), ""));
}
//#endregion
export { massage, parse, parseTOMLDocument };

//# sourceMappingURL=toml.js.map