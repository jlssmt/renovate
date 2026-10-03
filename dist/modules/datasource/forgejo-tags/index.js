import { ForgejoHttp } from "../../../util/http/forgejo.js";
import { GiteaTagsDatasource } from "../gitea-tags/index.js";
//#region lib/modules/datasource/forgejo-tags/index.ts
/**
* Forgejo is a fork of Gitea and serves the same API, so the lookup is
* inherited and only the identity of the datasource differs.
*/
var ForgejoTagsDatasource = class ForgejoTagsDatasource extends GiteaTagsDatasource {
	static id = "forgejo-tags";
	static defaultRegistryUrls = ["https://code.forgejo.org"];
	getDefaultRegistryUrls(_packageName) {
		return ForgejoTagsDatasource.defaultRegistryUrls;
	}
	cacheNamespace = "datasource-forgejo-tags";
	http = new ForgejoHttp(ForgejoTagsDatasource.id);
	constructor() {
		super(ForgejoTagsDatasource.id);
	}
};
//#endregion
export { ForgejoTagsDatasource };

//# sourceMappingURL=index.js.map