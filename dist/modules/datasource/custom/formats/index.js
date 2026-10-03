import { HtmlFetcher } from "./html.js";
import { JSONFetcher } from "./json.js";
import { PlainFetcher } from "./plain.js";
import { TomlFetcher } from "./toml.js";
import { YamlFetcher } from "./yaml.js";
//#region lib/modules/datasource/custom/formats/index.ts
const fetchers = {
	html: new HtmlFetcher(),
	json: new JSONFetcher(),
	plain: new PlainFetcher(),
	toml: new TomlFetcher(),
	yaml: new YamlFetcher()
};
//#endregion
export { fetchers };

//# sourceMappingURL=index.js.map