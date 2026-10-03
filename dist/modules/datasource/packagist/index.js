import { logger } from "../../../logger/index.js";
import { parseUrl, replaceUrlPath, resolveBaseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id } from "../../versioning/composer/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { map } from "../../../util/promises.js";
import { PackagesResponse, PackagistFile, RegistryMeta, extractDepReleases, parsePackagesResponses } from "./schema.js";
import { isNumber, isObject } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/packagist/index.ts
function isDefaultPackagistHost(registryUrl) {
	const url = parseUrl(registryUrl);
	/* v8 ignore if -- typescript strict null check */
	if (!url) return false;
	return ["repo.packagist.org", "packagist.org"].includes(url.host);
}
function isTransientPackagistError(err) {
	const { code: errCode, statusCode } = err;
	if (errCode && ["ECONNRESET", "ETIMEDOUT"].includes(errCode)) return true;
	if (!isNumber(statusCode)) return false;
	if (statusCode === 429 || statusCode >= 500 && statusCode < 600) return true;
	return false;
}
var PackagistDatasource = class PackagistDatasource extends Datasource {
	static id = "packagist";
	constructor() {
		super(PackagistDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://repo.packagist.org"];
	}
	defaultVersioning = id;
	registryStrategy = "hunt";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `time` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from `source` field in the results.";
	static getHostOpts(url) {
		const { username, password } = find({
			hostType: PackagistDatasource.id,
			url
		});
		return username && password ? {
			username,
			password
		} : {};
	}
	async getJson(url, schema) {
		const opts = PackagistDatasource.getHostOpts(url);
		const { body } = await this.http.getJson(url, opts, schema);
		return body;
	}
	async _getRegistryMeta(regUrl) {
		const url = resolveBaseUrl(regUrl, "packages.json");
		return await this.getJson(url, RegistryMeta);
	}
	getRegistryMeta(regUrl) {
		return withCache({
			namespace: `datasource-${PackagistDatasource.id}`,
			key: `getRegistryMeta:${regUrl}`
		}, () => this._getRegistryMeta(regUrl));
	}
	static isPrivatePackage(regUrl) {
		return !!PackagistDatasource.getHostOpts(regUrl).password;
	}
	static getPackagistFileUrl(regUrl, regFile) {
		const { key, hash } = regFile;
		const fileName = hash ? key.replace("%hash%", hash) : /* istanbul ignore next: hard to test */ key;
		return resolveBaseUrl(regUrl, fileName);
	}
	async _getPackagistFile(regUrl, regFile) {
		const url = PackagistDatasource.getPackagistFileUrl(regUrl, regFile);
		return await this.getJson(url, PackagistFile);
	}
	getPackagistFile(regUrl, regFile) {
		return withCache({
			namespace: `datasource-${PackagistDatasource.id}`,
			key: `getPackagistFile:${PackagistDatasource.getPackagistFileUrl(regUrl, regFile)}`,
			ttlMinutes: 1440,
			cacheable: !PackagistDatasource.isPrivatePackage(regUrl)
		}, () => this._getPackagistFile(regUrl, regFile));
	}
	async fetchProviderPackages(regUrl, meta) {
		await map(meta.files, async (file) => {
			const res = await this.getPackagistFile(regUrl, file);
			Object.assign(meta.providerPackages, res.providers);
		});
	}
	async fetchIncludesPackages(regUrl, meta) {
		await map(meta.includesFiles, async (file) => {
			const res = await this.getPackagistFile(regUrl, file);
			for (const [key, val] of Object.entries(res.packages)) meta.includesPackages[key] = extractDepReleases(val);
		});
	}
	async _packagistV2Lookup(registryUrl, metadataUrl, packageName) {
		const pkgUrl = replaceUrlPath(registryUrl, metadataUrl.replace("%package%", packageName));
		const pkgPromise = this.getJson(pkgUrl, z.unknown());
		const devUrl = replaceUrlPath(registryUrl, metadataUrl.replace("%package%", `${packageName}~dev`));
		const devPromise = this.getJson(devUrl, z.unknown()).then((x) => x, () => null);
		const responses = await Promise.all([pkgPromise, devPromise]).then((responses) => responses.filter(isObject));
		return parsePackagesResponses(packageName, responses);
	}
	packagistV2Lookup(registryUrl, metadataUrl, packageName) {
		return withCache({
			namespace: `datasource-${PackagistDatasource.id}`,
			key: `packagistV2Lookup:${registryUrl}:${metadataUrl}:${packageName}`,
			ttlMinutes: 10
		}, () => this._packagistV2Lookup(registryUrl, metadataUrl, packageName));
	}
	getPkgUrl(packageName, registryUrl, registryMeta) {
		if (registryMeta.providersUrl && packageName in registryMeta.providerPackages) {
			let url = registryMeta.providersUrl.replace("%package%", packageName);
			const hash = registryMeta.providerPackages[packageName];
			if (hash) url = url.replace("%hash%", hash);
			return replaceUrlPath(registryUrl, url);
		}
		if (registryMeta.providersLazyUrl) return replaceUrlPath(registryUrl, registryMeta.providersLazyUrl.replace("%package%", packageName));
		return null;
	}
	async getReleases({ packageName, registryUrl }) {
		logger.trace(`getReleases(${packageName})`);
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		try {
			const meta = await this.getRegistryMeta(registryUrl);
			if (meta.availablePackages && !meta.availablePackages.includes(packageName)) return null;
			if (meta.metadataUrl) return await this.packagistV2Lookup(registryUrl, meta.metadataUrl, packageName);
			if (meta.packages[packageName]) return extractDepReleases(meta.packages[packageName]);
			await this.fetchIncludesPackages(registryUrl, meta);
			if (meta.includesPackages[packageName]) return meta.includesPackages[packageName];
			await this.fetchProviderPackages(registryUrl, meta);
			const pkgUrl = this.getPkgUrl(packageName, registryUrl, meta);
			if (!pkgUrl) return null;
			const pkgRes = await this.getJson(pkgUrl, PackagesResponse);
			const dep = extractDepReleases(pkgRes.packages[packageName]);
			logger.trace({ dep }, "dep");
			return dep;
		} catch (err) /* istanbul ignore next */ {
			if (isDefaultPackagistHost(registryUrl) && isTransientPackagistError(err)) throw new ExternalHostError(err);
			throw err;
		}
	}
};
//#endregion
export { PackagistDatasource };

//# sourceMappingURL=index.js.map