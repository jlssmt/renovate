import { coerceArray } from "../../../util/array.js";
import { joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/glasskube/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { GlasskubePackageManifest, GlasskubePackageVersions } from "./schema.js";
//#region lib/modules/datasource/glasskube-packages/index.ts
var GlasskubePackagesDatasource = class GlasskubePackagesDatasource extends Datasource {
	static id = "glasskube-packages";
	static defaultRegistryUrl = "https://packages.dl.glasskube.dev/packages";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return [GlasskubePackagesDatasource.defaultRegistryUrl];
	}
	constructor() {
		super(GlasskubePackagesDatasource.id);
	}
	async _getReleases({ packageName, registryUrl }) {
		const result = { releases: [] };
		const { val: versions, err: versionsErr } = await this.http.getYamlSafe(joinUrlParts(registryUrl, packageName, "versions.yaml"), GlasskubePackageVersions).unwrap();
		if (versionsErr) this.handleGenericErrors(versionsErr);
		result.releases = versions.versions.map((it) => ({ version: it.version }));
		result.tags = { latest: versions.latestVersion };
		const { val: latestManifest, err: latestManifestErr } = await this.http.getYamlSafe(joinUrlParts(registryUrl, packageName, versions.latestVersion, "package.yaml"), GlasskubePackageManifest).unwrap();
		if (latestManifestErr) this.handleGenericErrors(latestManifestErr);
		for (const ref of coerceArray(latestManifest?.references)) if (ref.label.toLowerCase() === "github") result.sourceUrl = ref.url;
		else if (ref.label.toLowerCase() === "website") result.homepage = ref.url;
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GlasskubePackagesDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { GlasskubePackagesDatasource };

//# sourceMappingURL=index.js.map