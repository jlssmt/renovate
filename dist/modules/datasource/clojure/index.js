import { MAVEN_REPO } from "../maven/common.js";
import { MavenDatasource } from "../maven/index.js";
import { CLOJARS_REPO } from "./common.js";
//#region lib/modules/datasource/clojure/index.ts
var ClojureDatasource = class ClojureDatasource extends MavenDatasource {
	static id = "clojure";
	constructor() {
		super(ClojureDatasource.id);
	}
	registryStrategy = "merge";
	getDefaultRegistryUrls(_packageName) {
		return [CLOJARS_REPO, MAVEN_REPO];
	}
};
//#endregion
export { ClojureDatasource };

//# sourceMappingURL=index.js.map