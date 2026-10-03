import { get, set } from "../../../util/cache/memory/index.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts, parseUrl } from "../../../util/url.js";
import { toSha256 } from "../../../util/hash.js";
import { privateCacheDir, readCacheFile } from "../../../util/fs/index.js";
import { Json } from "../../../util/schema-utils/index.js";
import { id } from "../../versioning/cargo/index.js";
import { acquireLock } from "../../../util/mutex.js";
import { get as get$1, set as set$1 } from "../../../util/cache/package/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { createSimpleGit } from "../../../util/git/index.js";
import { CrateMetadataResponse, RegistryConfig, ReleaseTimestamp } from "./schema.js";
import { isBoolean } from "@sindresorhus/is";
import upath from "upath";
//#region lib/modules/datasource/crate/index.ts
var CrateDatasource = class CrateDatasource extends Datasource {
	static id = "crate";
	constructor() {
		super(CrateDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["sparse+https://index.crates.io/"];
	}
	defaultVersioning = id;
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `repository` field in the results.";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from `pubtime` field from crates.io index if available, or `version.created_at` field from crates.io API otherwise.";
	async _getReleases({ packageName, registryUrl }) {
		/* v8 ignore if -- should never happen */
		if (!registryUrl) {
			logger.warn("crate datasource: No registryUrl specified, cannot perform getReleases");
			return null;
		}
		const registryInfo = await CrateDatasource.fetchRegistryInfo({
			packageName,
			registryUrl
		});
		if (!registryInfo) {
			logger.debug(`Could not fetch registry info from ${registryUrl}`);
			return null;
		}
		const dependencyUrl = CrateDatasource.getDependencyUrl(registryInfo, packageName);
		const lines = (await this.fetchCrateRecordsPayload(registryInfo, packageName)).split(newlineRegex).map((line) => line.trim()).filter((line) => line.length !== 0).map((line) => JSON.parse(line));
		const metadata = await this.getCrateMetadata(registryInfo, packageName);
		const result = {
			dependencyUrl,
			releases: []
		};
		if (metadata?.homepage) result.homepage = metadata.homepage;
		if (metadata?.repository) result.sourceUrl = metadata.repository;
		result.releases = lines.map((line) => {
			const versionOrig = line.vers;
			const version = versionOrig.replace(regEx(/\+.*$/), "");
			const release = { version };
			if (versionOrig !== version) release.versionOrig = versionOrig;
			if (line.yanked) release.isDeprecated = true;
			if (line.rust_version) release.constraints = { rust: [line.rust_version] };
			if (line.pubtime) release.releaseTimestamp = asTimestamp(line.pubtime);
			return release;
		}).filter((release) => release.version);
		if (!result.releases.length) return null;
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${CrateDatasource.id}`,
			key: `${config.registryUrl}/${config.packageName}`,
			cacheable: CrateDatasource.isCratesIo(config.registryUrl),
			fallback: true
		}, () => this._getReleases(config));
	}
	/**
	* Fetches the registry's config.json which provides the API base URL
	* and download URL template.
	* See: https://doc.rust-lang.org/cargo/reference/registry-index.html#index-configuration
	*/
	async fetchRegistryConfig(info) {
		const cacheKey = `crate-datasource/registry-config/${info.rawUrl}`;
		const cached = get(cacheKey);
		if (cached) return cached;
		if (info.clonePath) try {
			const configPath = upath.join(info.clonePath, "config.json");
			const content = await readCacheFile(configPath, "utf8");
			const parsed = Json.pipe(RegistryConfig).parse(content);
			set(cacheKey, parsed);
			return parsed;
		} catch {
			logger.debug({ registryUrl: info.rawUrl }, "Could not read config.json from cloned registry");
		}
		else try {
			const configUrl = joinUrlParts(info.rawUrl, "config.json");
			const { body } = await this.http.getJson(configUrl, RegistryConfig);
			set(cacheKey, body);
			return body;
		} catch {
			logger.debug({ registryUrl: info.rawUrl }, "Could not fetch registry config.json");
		}
		return null;
	}
	/**
	* The registry web API specification only defines publish, yank, unyank,
	* owners, search and login endpoints, see
	* https://doc.rust-lang.org/cargo/reference/registry-web-api.html.
	* `GET api/v1/crates/<name>` and `GET api/v1/crates/<name>/<version>` are
	* crates.io extensions. Registries which mirror the crates.io index keep
	* `api` pointing at crates.io and are used without probing. Any other
	* registry is probed once and remembered as unsupported when it answers
	* 404, since private registries (Artifactory, CodeArtifact, ...) advertise
	* an `api` URL for publishing only.
	*/
	static isCratesIoApi(api) {
		return parseUrl(api)?.hostname === "crates.io";
	}
	static isNotFound(err) {
		return err instanceof RequestError && err.response?.statusCode === 404;
	}
	/**
	* The marker is keyed by the `api` URL, since the missing endpoints are a
	* property of the API server, not of the index that points to it.
	*/
	async isReadApiUnsupported(api) {
		if (CrateDatasource.isCratesIoApi(api)) return false;
		const memKey = `crate-datasource/registry-api-unsupported/${api}`;
		const cached = get(memKey);
		if (isBoolean(cached)) return cached;
		const unsupported = await get$1("datasource-crate-registry-api", api) === true;
		set(memKey, unsupported);
		return unsupported;
	}
	async markReadApiUnsupported(registryUrl, api) {
		logger.debug({
			registryUrl,
			api
		}, "Registry does not implement the crates.io read API, skipping crate metadata and release timestamp lookups");
		set(`crate-datasource/registry-api-unsupported/${api}`, true);
		await set$1("datasource-crate-registry-api", api, true, 1440);
	}
	async _getCrateMetadata(info, packageName) {
		const registryConfig = await this.fetchRegistryConfig(info);
		if (!registryConfig?.api) return null;
		const { api } = registryConfig;
		if (await this.isReadApiUnsupported(api)) return null;
		const crateUrl = `${joinUrlParts(api, "api/v1/")}crates/${packageName}?include=`;
		logger.trace({
			crateUrl,
			packageName,
			registryUrl: info.rawUrl
		}, "downloading crate metadata");
		try {
			const { body } = await this.http.getJson(crateUrl, CrateMetadataResponse);
			return body.crate;
		} catch (err) {
			if (!CrateDatasource.isCratesIoApi(api) && CrateDatasource.isNotFound(err)) {
				await this.markReadApiUnsupported(info.rawUrl, api);
				return null;
			}
			logger.debug({
				err,
				packageName,
				registryUrl: info.rawUrl
			}, "failed to download crate metadata");
		}
		return null;
	}
	getCrateMetadata(info, packageName) {
		return withCache({
			namespace: `datasource-${CrateDatasource.id}-metadata`,
			key: `${info.rawUrl}/${packageName}`,
			cacheable: info.flavor === "crates.io",
			ttlMinutes: 1440
		}, () => this._getCrateMetadata(info, packageName));
	}
	async fetchCrateRecordsPayload(info, packageName) {
		if (info.clonePath) {
			const path = upath.join(info.clonePath, ...CrateDatasource.getIndexSuffix(packageName));
			return readCacheFile(path, "utf8");
		}
		const packageSuffix = CrateDatasource.getIndexSuffix(packageName.toLowerCase());
		const crateUrl = joinUrlParts(info.rawUrl, ...packageSuffix);
		logger.trace({
			crateUrl,
			packageName,
			registryUrl: info.rawUrl
		}, "fetching crate records from sparse index");
		try {
			return (await this.http.getText(crateUrl)).body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	/**
	* Computes the dependency URL for a crate, given
	* registry information
	*/
	static getDependencyUrl(info, packageName) {
		switch (info.flavor) {
			case "crates.io": return `https://crates.io/crates/${packageName}`;
			case "cloudsmith": {
				const tokens = info.url.pathname.split("/");
				return `https://cloudsmith.io/~${tokens[2]}/repos/${tokens[3]}/packages/detail/cargo/${packageName}`;
			}
			default: return `${info.url}/${packageName}`;
		}
	}
	/**
	* Given a Git URL, computes a semi-human-readable name for a folder in which to
	* clone the repository.
	*/
	static cacheDirFromUrl(url) {
		return `crate-registry-${url.protocol.replace(regEx(/:$/), "")}-${url.hostname}-${toSha256(url.pathname).substring(0, 7)}`;
	}
	static isSparseRegistry(url) {
		const parsed = parseUrl(url);
		if (!parsed) return false;
		return parsed.protocol.startsWith("sparse+");
	}
	/**
	* Fetches information about a registry, by url.
	* If no url is given, assumes crates.io.
	* If an url is given, assumes it's a valid Git repository
	* url and clones it to cache.
	*/
	static async fetchRegistryInfo({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const isSparseRegistry = CrateDatasource.isSparseRegistry(registryUrl);
		const registryFetchUrl = isSparseRegistry ? registryUrl.replace(regEx(/^sparse\+/), "") : registryUrl;
		const url = parseUrl(registryFetchUrl);
		if (!url) {
			logger.debug(`Could not parse registry URL ${registryFetchUrl}`);
			return null;
		}
		let flavor;
		if (url.hostname === "index.crates.io") flavor = "crates.io";
		else if (url.hostname === "dl.cloudsmith.io") flavor = "cloudsmith";
		else flavor = "other";
		const registry = {
			flavor,
			rawUrl: registryFetchUrl,
			url
		};
		if (registry.flavor !== "crates.io" && !GlobalConfig.get("allowCustomCrateRegistries")) {
			logger.warn("crate datasource: allowCustomCrateRegistries=true is required for registries other than crates.io, bailing out");
			return null;
		}
		if (!isSparseRegistry) {
			const cacheKey = `crate-datasource/registry-clone-path/${registryFetchUrl}`;
			const lockKey = registryFetchUrl;
			const executionTimeout = GlobalConfig.get("executionTimeout") * 60 * 1e3;
			const gitTimeout = GlobalConfig.get("gitTimeout") || executionTimeout;
			const releaseLock = await acquireLock(lockKey, "crate-registry", gitTimeout);
			try {
				const cached = get(cacheKey);
				if (cached?.err) {
					logger.warn({
						err: cached.err,
						packageName,
						registryFetchUrl
					}, "Previous git clone failed, bailing out.");
					return null;
				}
				if (cached?.clonePath) {
					registry.clonePath = cached.clonePath;
					return registry;
				}
				const clonePath = upath.join(privateCacheDir(), CrateDatasource.cacheDirFromUrl(url));
				const result = await CrateDatasource.clone(registryFetchUrl, clonePath, packageName);
				set(cacheKey, result);
				if (result.err) {
					logger.warn({
						err: result.err,
						packageName,
						registryFetchUrl
					}, "Git clone failed, bailing out.");
					return null;
				}
				registry.clonePath = result.clonePath;
			} finally {
				releaseLock();
			}
		}
		return registry;
	}
	static async clone(registryFetchUrl, clonePath, packageName) {
		logger.info({
			clonePath,
			registryFetchUrl
		}, `Cloning private cargo registry`);
		const git = createSimpleGit({ config: { maxConcurrentProcesses: 1 } });
		try {
			await git.clone(registryFetchUrl, clonePath, { "--depth": 1 });
			return { clonePath };
		} catch (err) {
			if (err.message.includes("fatal: dumb http transport does not support shallow capabilities")) {
				logger.info({
					packageName,
					registryFetchUrl
				}, "failed to shallow clone git registry, doing full clone");
				try {
					await git.clone(registryFetchUrl, clonePath);
					return { clonePath };
				} catch (err) {
					logger.warn({
						err,
						packageName,
						registryFetchUrl
					}, "failed cloning git registry");
					return { err };
				}
			} else {
				logger.warn({
					err,
					packageName,
					registryFetchUrl
				}, "failed cloning git registry");
				return { err };
			}
		}
	}
	static isCratesIo(registryUrl) {
		if (!registryUrl) return false;
		const normalized = registryUrl.replace(regEx(/^sparse\+/), "");
		return parseUrl(normalized)?.hostname === "index.crates.io";
	}
	static getIndexSuffix(packageName) {
		const len = packageName.length;
		if (len === 1) return ["1", packageName];
		if (len === 2) return ["2", packageName];
		if (len === 3) return [
			"3",
			packageName[0],
			packageName
		];
		return [
			packageName.slice(0, 2),
			packageName.slice(2, 4),
			packageName
		];
	}
	async _postprocessRelease({ packageName, registryUrl }, release) {
		if (release.releaseTimestamp) return release;
		const rawUrl = registryUrl?.replace(regEx(/^sparse\+/), "");
		if (!rawUrl) return release;
		const cacheKey = `crate-datasource/registry-config/${rawUrl}`;
		const config = get(cacheKey);
		if (!config?.api) return release;
		const { api } = config;
		if (await this.isReadApiUnsupported(api)) return release;
		const url = `${joinUrlParts(api, "api/v1/")}crates/${packageName}/${release.versionOrig ?? release.version}`;
		logger.trace({
			url,
			packageName,
			version: release.version,
			registryUrl
		}, "fetching crate release timestamp");
		try {
			const { body: releaseTimestamp } = await this.http.getJson(url, { cacheProvider: memCacheProvider }, ReleaseTimestamp);
			release.releaseTimestamp = releaseTimestamp;
		} catch (err) {
			if (CrateDatasource.isCratesIoApi(api) || !CrateDatasource.isNotFound(err)) throw err;
			await this.markReadApiUnsupported(rawUrl, api);
		}
		return release;
	}
	postprocessRelease(config, release) {
		return withCache({
			namespace: `datasource-crate`,
			key: `postprocessRelease:${config.registryUrl}:${config.packageName}:${release.version}`,
			ttlMinutes: 10080,
			cacheable: CrateDatasource.isCratesIo(config.registryUrl ?? void 0)
		}, () => this._postprocessRelease(config, release));
	}
};
//#endregion
export { CrateDatasource };

//# sourceMappingURL=index.js.map