import { newlineRegex } from "../../../../util/regex.js";
import { readLocalFile } from "../../../../util/fs/index.js";
//#region lib/modules/datasource/custom/formats/plain.ts
function convertLinesToVersions(content) {
	return { releases: content.split(newlineRegex).map((line) => line.trim()).map((value) => {
		return { version: value };
	}) };
}
var PlainFetcher = class {
	async fetch(http, registryURL) {
		return convertLinesToVersions((await http.getPlain(registryURL)).body);
	}
	async readFile(registryURL) {
		const fileContent = await readLocalFile(registryURL, "utf8");
		return fileContent ? convertLinesToVersions(fileContent) : null;
	}
};
//#endregion
export { PlainFetcher };

//# sourceMappingURL=plain.js.map