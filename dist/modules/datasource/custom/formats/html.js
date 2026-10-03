import { readLocalFile } from "../../../../util/fs/index.js";
import { parse } from "../../../../util/html.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/datasource/custom/formats/html.ts
function extractLinks(content) {
	const body = parse(content);
	return { releases: [body, ...body.getElementsByTagName("pre").map((pre) => parse(pre.textContent))].flatMap((e) => e.getElementsByTagName("a")).map((node) => node.getAttribute("href")).filter(isTruthy).map((href) => {
		return { version: href };
	}) };
}
var HtmlFetcher = class {
	async fetch(http, registryURL) {
		return extractLinks((await http.getText(registryURL, { headers: { Accept: "text/html" } })).body);
	}
	async readFile(registryURL) {
		const fileContent = await readLocalFile(registryURL, "utf8");
		return fileContent ? extractLinks(fileContent) : null;
	}
};
//#endregion
export { HtmlFetcher };

//# sourceMappingURL=html.js.map