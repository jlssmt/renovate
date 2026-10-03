import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getQueryString, joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/hashicorp/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { map } from "../../../util/promises.js";
import { TerraformDatasource } from "../terraform-module/base.js";
import { createSDBackendURL } from "../terraform-module/utils.js";
import { OpenTofuProviderDocsResponse, OpenTofuProviderPackagesResponse, TerraformProviderReleaseBackend, TerraformProviderV2Response, TerraformProviderVersions, TerraformRegistryBuildResponse, TerraformRegistryVersions, VersionDetailResponse } from "./schema.js";
//#region lib/modules/datasource/terraform-provider/index.ts
var TerraformProviderDatasource = class TerraformProviderDatasource extends TerraformDatasource {
	static id = "terraform-provider";
	static hashicorpReleaseUrl = "https://releases.hashicorp.com";
	static defaultRegistryUrls = [TerraformProviderDatasource.terraformRegistryUrl, TerraformProviderDatasource.hashicorpReleaseUrl];
	static getDefaultRegistryUrls() {
		return TerraformProviderDatasource.defaultRegistryUrls;
	}
	static repositoryRegex = regEx(/^hashicorp\/(?<packageName>\S+)$/);
	constructor() {
		super(TerraformProviderDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return TerraformProviderDatasource.defaultRegistryUrls;
	}
	defaultVersioning = id;
	registryStrategy = "hunt";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is only available for `registry.terraform.io` (v2 API) and `registry.opentofu.org` (via `api.opentofu.org`). Other registries using the Provider Registry Protocol do not provide timestamps.";
	sourceUrlSupport = "package";
	sourceUrlNote = "For `registry.terraform.io`, the source URL is taken from the `source` field of the v2 API response. For `registry.opentofu.org`, it is derived from the package name following the OpenTofu registry policy of `github.com/NAMESPACE/terraform-provider-NAME`.";
	async fetchReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		logger.trace(`terraform-provider.getDependencies() packageName: ${packageName}`);
		if (registryUrl === TerraformProviderDatasource.terraformRegistryUrl) return await this.queryTerraformRegistryV2(registryUrl, packageName);
		if (registryUrl === TerraformProviderDatasource.openTofuRegistryUrl || registryUrl === TerraformProviderDatasource.openTofuApiUrl) return await this.queryOpenTofuRegistry(packageName);
		if (registryUrl === TerraformProviderDatasource.hashicorpReleaseUrl) return await this.queryReleaseBackend(packageName, registryUrl);
		return await this.queryProviderRegistry(registryUrl, packageName);
	}
	getReleases(config) {
		const url = config.registryUrl;
		const repo = TerraformProviderDatasource.getRepository(config);
		return this.cached({
			key: `getReleases:${url}/${repo}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	static getRepository({ packageName }) {
		return packageName.includes("/") ? packageName : `hashicorp/${packageName}`;
	}
	/**
	* Query the Terraform Registry using the undocumented v2 JSON:API.
	*
	* Returns release timestamps for all versions, unlike the v1 API
	* which only exposed the timestamp for the latest version.
	*/
	async queryTerraformRegistryV2(registryUrl, packageName) {
		const repository = TerraformProviderDatasource.getRepository({ packageName });
		const providerUrl = `${joinUrlParts(registryUrl, "v2/providers", repository)}?${getQueryString({ include: "provider-versions" })}`;
		const { body: res } = await this.http.getJson(providerUrl, TerraformProviderV2Response);
		res.homepage = `${registryUrl}/providers/${repository}`;
		return res;
	}
	/**
	* Query the OpenTofu registry docs API.
	* https://api.opentofu.org/
	*
	* Used when the registry URL is `registry.opentofu.org`.
	* Queries `api.opentofu.org` for provider versions with release timestamps.
	*/
	async queryOpenTofuRegistry(packageName) {
		const repository = TerraformProviderDatasource.getRepository({ packageName });
		const docsUrl = joinUrlParts(TerraformProviderDatasource.openTofuApiUrl, "registry/docs/providers", repository, "index.json");
		const { body: res } = await this.http.getJson(docsUrl, OpenTofuProviderDocsResponse);
		res.homepage = `https://search.opentofu.org/provider/${repository}`;
		const [namespace, name] = repository.split("/");
		res.sourceUrl = `https://github.com/${namespace}/terraform-provider-${name}`;
		return res;
	}
	/**
	* Query a registry using the Provider Registry Protocol that all registries
	* are required to implement.
	* https://www.terraform.io/internals/provider-registry-protocol
	*/
	async queryProviderRegistry(registryUrl, packageName) {
		const repository = TerraformProviderDatasource.getRepository({ packageName });
		const serviceDiscovery = await this.getTerraformServiceDiscoveryResult(registryUrl);
		const backendURL = createSDBackendURL(registryUrl, "providers.v1", serviceDiscovery, `${repository}/versions`);
		return { releases: (await this.http.getJson(backendURL, TerraformProviderVersions)).body.versions.map(({ version }) => ({ version })) };
	}
	async queryReleaseBackend(packageName, registryURL) {
		const backendLookUpName = `terraform-provider-${packageName.replace("hashicorp/", "")}`;
		const backendURL = joinUrlParts(registryURL, backendLookUpName, `index.json`);
		const res = (await this.http.getJson(backendURL, TerraformProviderReleaseBackend)).body;
		return {
			releases: Object.keys(res.versions).map((version) => ({ version })),
			sourceUrl: joinUrlParts("https://github.com/terraform-providers", backendLookUpName)
		};
	}
	async fetchBuilds(registryURL, repository, version) {
		if (registryURL === TerraformProviderDatasource.hashicorpReleaseUrl) {
			const repositoryRegexResult = TerraformProviderDatasource.repositoryRegex.exec(repository)?.groups;
			if (!repositoryRegexResult) return null;
			const backendLookUpName = `terraform-provider-${repositoryRegexResult.packageName}`;
			let versionReleaseBackend;
			try {
				versionReleaseBackend = await this.getReleaseBackendIndex(backendLookUpName, version);
			} catch (err) {
				if (err instanceof ExternalHostError) throw err;
				logger.debug({
					err,
					backendLookUpName,
					version
				}, `Failed to retrieve builds for ${backendLookUpName} ${version}`);
				throw new ExternalHostError(err);
			}
			return versionReleaseBackend.builds;
		}
		const serviceDiscovery = await this.getTerraformServiceDiscoveryResult(registryURL);
		if (!serviceDiscovery) throw new ExternalHostError(/* @__PURE__ */ new Error(`Service discovery not found for ${registryURL}`));
		const backendURL = createSDBackendURL(registryURL, "providers.v1", serviceDiscovery, repository);
		const versionsResponse = (await this.http.getJson(`${backendURL}/versions`, TerraformRegistryVersions)).body;
		if (!versionsResponse.versions) throw new ExternalHostError(/* @__PURE__ */ new Error(`Failed to retrieve version list for ${backendURL}`));
		const builds = versionsResponse.versions.find((value) => value.version === version);
		if (!builds) throw new ExternalHostError(/* @__PURE__ */ new Error(`No builds found for ${repository}:${version} on ${registryURL}`));
		return await map(builds.platforms, async (platform) => {
			const buildURL = `${backendURL}/${version}/download/${platform.os}/${platform.arch}`;
			try {
				const res = (await this.http.getJson(buildURL, TerraformRegistryBuildResponse)).body;
				return {
					name: repository,
					url: res.download_url,
					version,
					...res
				};
			} catch (err) {
				/* v8 ignore next -- hard to test */
				if (err instanceof ExternalHostError) throw err;
				logger.debug({
					err,
					url: buildURL
				}, "Failed to retrieve build");
				throw new ExternalHostError(err);
			}
		}, { concurrency: 4 });
	}
	getBuilds(registryURL, repository, version) {
		return this.cached({ key: `getBuilds:${registryURL}/${repository}/${version}` }, () => this.fetchBuilds(registryURL, repository, version));
	}
	/**
	* A single platform's download endpoint returns the hashes for all platforms,
	* so we query `linux/amd64` and fall back to `/versions` discovery only when a
	* provider lacks that platform (404).
	* See https://github.com/opentofu/opentofu/pull/3434
	*/
	async fetchProviderPackages(repository, version) {
		const baseUrl = joinUrlParts(TerraformProviderDatasource.openTofuRegistryUrl, "v1/providers", repository);
		try {
			try {
				const { body } = await this.http.getJson(`${baseUrl}/${version}/download/linux/amd64`, OpenTofuProviderPackagesResponse);
				return body;
			} catch (err) {
				if (!(err instanceof RequestError) || err.response?.statusCode !== 404) throw err;
			}
			return await this.fetchProviderPackagesForAvailablePlatform(baseUrl, version);
		} catch (err) {
			if (err instanceof ExternalHostError) throw err;
			logger.debug({
				err,
				repository,
				version
			}, `Failed to retrieve provider packages for ${repository}@${version}`);
			throw new ExternalHostError(err);
		}
	}
	/**
	* Some providers do not publish a `linux/amd64` build, so discover an
	* available platform via `/versions` and fetch its download endpoint.
	*/
	async fetchProviderPackagesForAvailablePlatform(baseUrl, version) {
		const { body: versionsResponse } = await this.http.getJson(`${baseUrl}/versions`, TerraformRegistryVersions);
		const platform = versionsResponse.versions?.find((entry) => entry.version === version)?.platforms?.[0];
		if (!platform) return null;
		const { body: hashes } = await this.http.getJson(`${baseUrl}/${version}/download/${platform.os}/${platform.arch}`, OpenTofuProviderPackagesResponse);
		return hashes;
	}
	getProviderPackages(repository, version) {
		return this.cached({ key: `getProviderPackages:${repository}/${version}` }, () => this.fetchProviderPackages(repository, version));
	}
	async fetchZipHashes(zipHashUrl) {
		let rawHashData;
		try {
			rawHashData = (await this.http.getText(zipHashUrl)).body;
		} catch (err) {
			/* v8 ignore next -- hard to test */
			if (err instanceof ExternalHostError) throw err;
			logger.debug({
				err,
				zipHashUrl
			}, `Failed to retrieve zip hashes from ${zipHashUrl}`);
			return;
		}
		return rawHashData.trimEnd().split("\n").map((line) => line.split(regEx(/\s/))[0]);
	}
	getZipHashes(zipHashUrl) {
		return this.cached({ key: `getZipHashes:${zipHashUrl}` }, () => this.fetchZipHashes(zipHashUrl));
	}
	async fetchReleaseBackendIndex(backendLookUpName, version) {
		return (await this.http.getJson(`${TerraformProviderDatasource.hashicorpReleaseUrl}/${backendLookUpName}/${version}/index.json`, VersionDetailResponse)).body;
	}
	getReleaseBackendIndex(backendLookUpName, version) {
		return this.cached({ key: `getReleaseBackendIndex:${backendLookUpName}/${version}` }, () => this.fetchReleaseBackendIndex(backendLookUpName, version));
	}
};
//#endregion
export { TerraformProviderDatasource };

//# sourceMappingURL=index.js.map