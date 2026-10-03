import data from "../../../data-files.generated.js";
import { id } from "../../versioning/kubernetes-api/index.js";
import { Datasource } from "../datasource.js";
import JSON5 from "json5";
//#region lib/modules/datasource/kubernetes-api/index.ts
const apiData = JSON5.parse(data.get("data/kubernetes-api.json5"));
const supportedApis = new Set(Object.keys(apiData));
var KubernetesApiDatasource = class KubernetesApiDatasource extends Datasource {
	static id = "kubernetes-api";
	constructor() {
		super(KubernetesApiDatasource.id);
	}
	defaultVersioning = id;
	getReleases({ packageName }) {
		const versions = apiData[packageName];
		if (versions) {
			const releases = versions.map((version) => ({ version }));
			return Promise.resolve({ releases });
		}
		return Promise.resolve(null);
	}
};
//#endregion
export { KubernetesApiDatasource, supportedApis };

//# sourceMappingURL=index.js.map