import { Datasource } from "../datasource.js";
import { RpmXmlMetadataProvider } from "./providers/xml.js";
import { fetchPrimaryUrl } from "./repomd.js";
//#region lib/modules/datasource/rpm/index.ts
var RpmDatasource = class RpmDatasource extends Datasource {
	static id = "rpm";
	xmlProvider;
	constructor() {
		super(RpmDatasource.id);
		this.xmlProvider = new RpmXmlMetadataProvider(this.http);
	}
	/**
	* Users are able to specify custom RPM repositories as long as they follow the format.
	* There is a URI http://linux.duke.edu/metadata/common in the <sha>-primary.xml.
	* But according to this post, it's not something we can really look into or reference.
	* @see{https://lists.rpm.org/pipermail/rpm-ecosystem/2015-October/000283.html}
	*/
	supportsCustomRegistry(_packageName) {
		return true;
	}
	/**
	* Users can specify multiple repositories and the datasource will aggregate the releases
	* @example
	* Every Fedora release has "release" and "updates" repositories.
	* To get the latest package version, these repositories should be aggregated.
	*/
	registryStrategy = "merge";
	/**
	* Fetches the release information for a given package from the registry URL.
	*
	* @param registryUrl - the registryUrl should be the folder which contains repodata.xml and its corresponding file list <sha256>-primary.xml.gz, e.g.: https://packages.microsoft.com/azurelinux/3.0/prod/cloud-native/x86_64/repodata/
	* @param packageName - the name of the package to fetch releases for.
	* @returns The release result if the package is found, otherwise null.
	*/
	async fetchReleases({ registryUrl, packageName }) {
		if (!registryUrl || !packageName) return null;
		try {
			const primaryUrl = await this.getPrimaryUrl(registryUrl);
			return await this.getReleasesByPackageName(primaryUrl, packageName);
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			ttlMinutes: 1440,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	getPrimaryUrl(registryUrl) {
		return this.cached({
			key: registryUrl,
			ttlMinutes: 1440
		}, () => fetchPrimaryUrl(this.http, registryUrl));
	}
	getReleasesByPackageName(primaryUrl, packageName) {
		return this.xmlProvider.getReleases(primaryUrl, packageName);
	}
};
//#endregion
export { RpmDatasource };

//# sourceMappingURL=index.js.map