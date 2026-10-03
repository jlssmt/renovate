import { api, id } from "../../versioning/unity3d-packages/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { UnityPackageReleasesJSON } from "./schema.js";
//#region lib/modules/datasource/unity3d-packages/index.ts
var Unity3dPackagesDatasource = class Unity3dPackagesDatasource extends Datasource {
	static id = "unity3d-packages";
	static defaultRegistryUrl = "https://packages.unity.com";
	getDefaultRegistryUrls(_packageName) {
		return [Unity3dPackagesDatasource.defaultRegistryUrl];
	}
	defaultVersioning = id;
	constructor() {
		super(Unity3dPackagesDatasource.id);
	}
	async _getReleases({ packageName, registryUrl }) {
		const response = await this.http.getJson(`${registryUrl}/${packageName}`, UnityPackageReleasesJSON);
		const usingDefaultRegistry = registryUrl === Unity3dPackagesDatasource.defaultRegistryUrl;
		const versions = Object.values(response.body.versions);
		const result = {
			releases: [],
			homepage: versions?.[0]?.documentationUrl,
			registryUrl,
			sourceUrl: versions?.[0]?.repository?.url
		};
		for (const release of versions) result.releases.push({
			version: release.version,
			releaseTimestamp: asTimestamp(response.body.time[release.version]),
			changelogContent: release._upm?.changelog,
			changelogUrl: usingDefaultRegistry ? release.documentationUrl?.replace("manual/index.html", "changelog/CHANGELOG.html") : void 0,
			isStable: api.isStable(release.version),
			registryUrl
		});
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${Unity3dPackagesDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { Unity3dPackagesDatasource };

//# sourceMappingURL=index.js.map