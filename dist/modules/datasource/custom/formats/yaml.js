import { parseSingleYaml } from "../../../../util/yaml.js";
import { readLocalFile } from "../../../../util/fs/index.js";
//#region lib/modules/datasource/custom/formats/yaml.ts
var YamlFetcher = class {
	async fetch(http, registryURL) {
		const response = await http.getText(registryURL);
		return parseSingleYaml(response.body);
	}
	async readFile(registryURL) {
		const fileContent = await readLocalFile(registryURL, "utf8");
		return parseSingleYaml(fileContent);
	}
};
//#endregion
export { YamlFetcher };

//# sourceMappingURL=yaml.js.map