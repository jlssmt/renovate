import { parse } from "../../../../util/toml.js";
import { readLocalFile } from "../../../../util/fs/index.js";
//#region lib/modules/datasource/custom/formats/toml.ts
var TomlFetcher = class {
	async fetch(http, registryURL) {
		return (await http.getToml(registryURL)).body;
	}
	async readFile(registryURL) {
		const fileContent = await readLocalFile(registryURL, "utf8");
		return parse(fileContent);
	}
};
//#endregion
export { TomlFetcher };

//# sourceMappingURL=toml.js.map