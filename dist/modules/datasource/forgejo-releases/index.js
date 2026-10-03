import { ForgejoHttp } from "../../../util/http/forgejo.js";
import { GiteaReleasesDatasource } from "../gitea-releases/index.js";
//#region lib/modules/datasource/forgejo-releases/index.ts
/**
* Forgejo is a fork of Gitea and serves the same API, so the lookup is
* inherited and only the identity of the datasource differs.
*/
var ForgejoReleasesDatasource = class ForgejoReleasesDatasource extends GiteaReleasesDatasource {
	static id = "forgejo-releases";
	static defaultRegistryUrls = ["https://code.forgejo.org"];
	getDefaultRegistryUrls(_packageName) {
		return ForgejoReleasesDatasource.defaultRegistryUrls;
	}
	cacheNamespace = "datasource-forgejo-releases";
	http = new ForgejoHttp(ForgejoReleasesDatasource.id);
	constructor() {
		super(ForgejoReleasesDatasource.id);
	}
};
//#endregion
export { ForgejoReleasesDatasource };

//# sourceMappingURL=index.js.map