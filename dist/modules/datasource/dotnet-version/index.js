import { Datasource } from "../datasource.js";
import { map } from "../../../util/promises.js";
import { DotnetRuntimeReleases, DotnetSdkReleases, ReleasesIndex } from "./schema.js";
//#region lib/modules/datasource/dotnet-version/index.ts
var DotnetVersionDatasource = class DotnetVersionDatasource extends Datasource {
	static id = "dotnet-version";
	constructor() {
		super(DotnetVersionDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/releases-index.json"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `release-date` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL https://github.com/dotnet/sdk for the `dotnet-sdk` package and, the https://github.com/dotnet/runtime URL for the `dotnet-runtime` package.";
	async fetchReleases({ packageName }) {
		if (!(packageName === "dotnet-sdk" || packageName === "dotnet-runtime")) return null;
		try {
			const registryUrl = this.getDefaultRegistryUrls("")[0];
			const { body: urls } = await this.http.getJson(registryUrl, ReleasesIndex);
			return {
				releases: (await map(urls, (url) => this.getChannelReleases(url, packageName), {
					concurrency: 1,
					stopOnError: true
				})).flat(),
				sourceUrl: packageName === "dotnet-sdk" ? "https://github.com/dotnet/sdk" : "https://github.com/dotnet/runtime"
			};
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return this.cached({
			key: config.packageName,
			ttlMinutes: 1440,
			fallback: true,
			cacheable: true
		}, () => this.fetchReleases(config));
	}
	async fetchChannelReleases(releaseUrl, packageName) {
		const schema = packageName === "dotnet-sdk" ? DotnetSdkReleases : DotnetRuntimeReleases;
		try {
			const { body } = await this.http.getJson(releaseUrl, schema);
			return body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getChannelReleases(releaseUrl, packageName) {
		return this.cached({
			key: `${releaseUrl}:${packageName}`,
			ttlMinutes: 1440,
			cacheable: true
		}, () => this.fetchChannelReleases(releaseUrl, packageName));
	}
};
//#endregion
export { DotnetVersionDatasource };

//# sourceMappingURL=index.js.map