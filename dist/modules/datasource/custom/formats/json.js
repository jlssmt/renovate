import { readLocalFile } from "../../../../util/fs/index.js";
//#region lib/modules/datasource/custom/formats/json.ts
var JSONFetcher = class {
	async fetch(http, registryURL) {
		return (await http.getJsonUnchecked(registryURL)).body;
	}
	async readFile(registryURL) {
		const fileContent = await readLocalFile(registryURL, "utf8");
		return JSON.parse(fileContent);
	}
};
//#endregion
export { JSONFetcher };

//# sourceMappingURL=json.js.map