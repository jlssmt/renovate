import { logger } from "../../../logger/index.js";
import { joinUrlParts, parseUrl } from "../../../util/url.js";
import "../../versioning/hex/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { HexRelease } from "./schema.js";
import { Package } from "./v2/package.js";
import { Signed } from "./v2/signed.js";
import { promisify } from "node:util";
import { verify } from "node:crypto";
import { gunzip } from "node:zlib";
//#region lib/modules/datasource/hex/index.ts
const defaultRegistryUrl = "https://hex.pm";
const defaultHexRepositoryUrl = "https://repo.hex.pm";
const defaultHexRepositoryName = "hexpm";
const defaultHexRepositoryHostname = parseUrl(defaultHexRepositoryUrl)?.hostname;
const defaultHexPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApqREcFDt5vV21JVe2QNB
Edvzk6w36aNFhVGWN5toNJRjRJ6m4hIuG4KaXtDWVLjnvct6MYMfqhC79HAGwyF+
IqR6Q6a5bbFSsImgBJwz1oadoVKD6ZNetAuCIK84cjMrEFRkELtEIPNHblCzUkkM
3rS9+DPlnfG8hBvGi6tvQIuZmXGCxF/73hU0/MyGhbmEjIKRtG6b0sJYKelRLTPW
XgK7s5pESgiwf2YC/2MGDXjAJfpfCd0RpLdvd4eRiXtVlE9qO9bND94E7PgQ/xqZ
J1i2xWFndWa6nfFnRxZmCStCOZWYYPlaxr+FZceFbpMwzTNs4g3d4tLNUcbKAIH4
0wIDAQAB
-----END PUBLIC KEY-----`;
const gunzipAsync = promisify(gunzip);
function parsePackageName(packageName) {
	const [hexPackageName, organizationName] = packageName.split(":");
	const organizationUrlPrefix = organizationName ? `repos/${organizationName}/` : "";
	return {
		hexPackageName,
		organizationName: organizationName ?? null,
		organizationUrlPrefix
	};
}
function getExpectedRepositoryName(registryUrl, organizationName) {
	if (organizationName) return organizationName;
	return parseUrl(registryUrl)?.hostname === defaultHexRepositoryHostname ? defaultHexRepositoryName : null;
}
function isSignedPayloadValid(signed, publicKey, packageName) {
	if (!signed.signature?.length) {
		logger.warn({ packageName }, "hex: missing signature in V2 response");
		return false;
	}
	try {
		return verify("RSA-SHA512", signed.payload, publicKey, signed.signature);
	} catch (err) {
		logger.warn({
			err,
			packageName
		}, "hex: invalid public key or signature");
		return false;
	}
}
function mapV2Releases(pkg) {
	const releases = [];
	for (const release of pkg.releases) {
		if (!release.version) continue;
		releases.push({
			version: release.version,
			...release.retired && { isDeprecated: true }
		});
	}
	return releases;
}
var HexDatasource = class HexDatasource extends Datasource {
	static id = "hex";
	constructor() {
		super(HexDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	defaultVersioning = "hex";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined the `inserted_at` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `Github` field in the results.";
	async getReleasesViaJsonApi({ packageName, registryUrl }) {
		/* v8 ignore if -- should never happen */
		if (!registryUrl) return null;
		const { hexPackageName, organizationUrlPrefix } = parsePackageName(packageName);
		const hexUrl = joinUrlParts(registryUrl, `/api/${organizationUrlPrefix}packages/${hexPackageName}`);
		const { val: result, err } = await this.http.getJsonSafe(hexUrl, HexRelease).onError((err) => {
			logger.warn({
				url: hexUrl,
				datasource: "hex",
				packageName,
				err
			}, "Error fetching from url");
		}).unwrap();
		if (err) this.handleGenericErrors(err);
		return result;
	}
	async getReleasesViaV2Protocol({ packageName, registryUrl }) {
		/* v8 ignore if -- should never happen */
		if (!registryUrl) return null;
		const { hexPackageName, organizationName, organizationUrlPrefix } = parsePackageName(packageName);
		const url = joinUrlParts(registryUrl, `/${organizationUrlPrefix}packages/${hexPackageName}`);
		const { body } = await this.http.getBuffer(url);
		const decompressed = await gunzipAsync(body);
		const signed = Signed.decode(decompressed);
		const publicKey = await this.getPublicKey(registryUrl);
		if (publicKey && !isSignedPayloadValid(signed, publicKey, packageName)) return null;
		const pkg = Package.decode(signed.payload);
		if (pkg.name !== hexPackageName) {
			logger.warn({
				packageName,
				registryUrl,
				expectedPackageName: hexPackageName,
				actualPackageName: pkg.name
			}, "hex: V2 package name mismatch");
			return null;
		}
		const expectedRepositoryName = getExpectedRepositoryName(registryUrl, organizationName);
		if (expectedRepositoryName && pkg.repository !== expectedRepositoryName) {
			logger.warn({
				packageName,
				registryUrl,
				expectedRepositoryName,
				actualRepositoryName: pkg.repository
			}, "hex: V2 repository mismatch");
			return null;
		}
		const releases = mapV2Releases(pkg);
		if (releases.length === 0) return null;
		return { releases };
	}
	async getPublicKey(registryUrl) {
		if (registryUrl === defaultHexRepositoryUrl) return defaultHexPublicKey;
		const url = joinUrlParts(registryUrl, "/public_key");
		try {
			const { body } = await this.http.getText(url, { cacheProvider: memCacheProvider });
			const publicKey = body.trim();
			if (publicKey.length === 0) {
				logger.warn({
					registryUrl,
					url
				}, "hex: empty V2 public key response");
				return null;
			}
			return publicKey;
		} catch (err) {
			logger.warn({
				err,
				registryUrl,
				url
			}, "hex: failed to fetch V2 public key, falling back to unsigned payload");
			return null;
		}
	}
	async _getReleases(config) {
		if (HexDatasource.isDefaultRegistry(config.registryUrl)) return this.getReleasesViaJsonApi(config);
		try {
			return await this.getReleasesViaV2Protocol(config);
		} catch (err) {
			logger.warn({
				registryUrl: config.registryUrl,
				packageName: config.packageName,
				err
			}, "hex: error fetching package via V2 protocol");
			this.handleGenericErrors(err);
		}
	}
	static isDefaultRegistry(registryUrl) {
		return !registryUrl || registryUrl === defaultRegistryUrl;
	}
	getReleases(config) {
		const isDefault = HexDatasource.isDefaultRegistry(config.registryUrl);
		const key = isDefault ? config.packageName : `${config.registryUrl}:${config.packageName}`;
		return withCache({
			namespace: `datasource-${HexDatasource.id}`,
			key,
			cacheable: isDefault,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { HexDatasource };

//# sourceMappingURL=index.js.map