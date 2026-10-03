import { logger } from "../../../logger/index.js";
import { getQueryString, isHttpUrl, joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/hashicorp/index.js";
import { OpenTofuModuleDocsResponse, ProtocolModuleResponse, TerraformModuleResponse, TerraformModuleV2Response } from "./schema.js";
import { TerraformDatasource } from "./base.js";
import { createSDBackendURL, getRegistryRepository } from "./utils.js";
//#region lib/modules/datasource/terraform-module/index.ts
var TerraformModuleDatasource = class TerraformModuleDatasource extends TerraformDatasource {
	static id = "terraform-module";
	static terraformCloudUrl = "https://app.terraform.io";
	static defaultRegistryUrls = [TerraformModuleDatasource.terraformRegistryUrl];
	constructor() {
		super(TerraformModuleDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return TerraformModuleDatasource.defaultRegistryUrls;
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "For `registry.terraform.io` and `registry.opentofu.org` (via `api.opentofu.org`), release timestamps are available for all versions. For `app.terraform.io`, only the latest version is annotated, using the `published_at` field from the extended module endpoint.";
	sourceUrlSupport = "package";
	sourceUrlNote = "For `registry.terraform.io` and `app.terraform.io`, the source URL is taken from the `source` field of the registry response. For `registry.opentofu.org`, it is derived from the package name following the OpenTofu registry policy of `github.com/NAMESPACE/terraform-TARGETSYSTEM-NAME`.";
	/**
	* Resolves a module release list for the configured registry.
	*
	* Requests against the public Terraform registry and Terraform Cloud use the
	* registry-specific module endpoint, while other registries use the generic
	* Module Registry Protocol versions endpoint.
	*/
	async fetchReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const { registry, repository } = getRegistryRepository(packageName, registryUrl);
		logger.trace({
			registryUrlNormalized: registry,
			terraformRepository: repository
		}, "terraform-module.getReleases()");
		try {
			if (registry === TerraformModuleDatasource.terraformRegistryUrl) return await this.queryTerraformRegistryV2(registry, repository);
			if (registry === TerraformModuleDatasource.openTofuRegistryUrl || registry === TerraformModuleDatasource.openTofuApiUrl) return await this.queryOpenTofuRegistry(repository);
			if (registry === TerraformModuleDatasource.terraformCloudUrl) return await this.queryTerraformRegistry(registry, repository);
			return await this.queryModuleRegistry(registry, repository);
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return this.cached({
			key: TerraformModuleDatasource.getCacheKey(config),
			fallback: true
		}, () => this.fetchReleases(config));
	}
	/**
	* Query the Terraform Registry using the undocumented v2 JSON:API.
	*
	* Returns release timestamps for all versions, unlike the v1 extended
	* module endpoint which only exposed the timestamp for the latest version.
	*/
	async queryTerraformRegistryV2(registryUrl, repository) {
		const moduleUrl = `${joinUrlParts(registryUrl, "v2/modules", repository)}?${getQueryString({ include: "module-versions" })}`;
		const { body: res } = await this.http.getJson(moduleUrl, TerraformModuleV2Response);
		res.homepage = `${registryUrl}/modules/${repository}`;
		return res;
	}
	/**
	* Query the OpenTofu registry docs API.
	* https://api.opentofu.org/
	*
	* Used when the registry URL is `registry.opentofu.org`.
	* Queries `api.opentofu.org` for module versions with release timestamps.
	*/
	async queryOpenTofuRegistry(repository) {
		const docsUrl = joinUrlParts(TerraformModuleDatasource.openTofuApiUrl, "registry/docs/modules", repository, "index.json");
		const { body: res } = await this.http.getJson(docsUrl, OpenTofuModuleDocsResponse);
		res.homepage = `https://search.opentofu.org/module/${repository}`;
		const [namespace, name, target] = repository.split("/");
		res.sourceUrl = `https://github.com/${namespace}/terraform-${target}-${name}`;
		return res;
	}
	/**
	* Queries the Terraform Registry module endpoint.
	*
	* The response includes the latest published version separately, so only that
	* release can be annotated with `releaseTimestamp`.
	*
	* https://developer.hashicorp.com/terraform/registry/api-docs#get-a-specific-module
	*/
	async queryTerraformRegistry(registryUrl, repository) {
		const serviceDiscovery = await this.getTerraformServiceDiscoveryResult(registryUrl);
		const pkgUrl = createSDBackendURL(registryUrl, "modules.v1", serviceDiscovery, repository);
		const { body: res } = await this.http.getJson(pkgUrl, TerraformModuleResponse);
		return {
			releases: res.versions,
			sourceUrl: res.source,
			homepage: `${registryUrl}/modules/${repository}`
		};
	}
	/**
	* Queries a registry through the Terraform Module Registry Protocol.
	*
	* This is the default path for registries implementing the standard module
	* registry protocol. It returns release versions and, when present and valid,
	* the upstream source URL.
	*
	* https://developer.hashicorp.com/terraform/internals/module-registry-protocol
	*/
	async queryModuleRegistry(registryUrl, repository) {
		const serviceDiscovery = await this.getTerraformServiceDiscoveryResult(registryUrl);
		const pkgUrl = createSDBackendURL(registryUrl, "modules.v1", serviceDiscovery, `${repository}/versions`);
		const { body: res } = await this.http.getJson(pkgUrl, ProtocolModuleResponse);
		return {
			releases: res.versions,
			sourceUrl: isHttpUrl(res.source) ? res.source : void 0
		};
	}
	static getCacheKey({ packageName, registryUrl }) {
		const { registry, repository } = getRegistryRepository(packageName, registryUrl);
		return `${registry}/${repository}`;
	}
};
//#endregion
export { TerraformModuleDatasource };

//# sourceMappingURL=index.js.map