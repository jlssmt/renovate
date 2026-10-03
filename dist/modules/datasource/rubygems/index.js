import { logger } from "../../../logger/index.js";
import { getQueryString, joinUrlParts, parseUrl } from "../../../util/url.js";
import { id } from "../../versioning/ruby/index.js";
import { RequestError } from "../../../util/http/got.js";
import { AsyncResult, Result } from "../../../util/result.js";
import { Http } from "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { GemInfo, MarshalledVersionInfo } from "./schema.js";
import { getV1Releases } from "./common.js";
import { MetadataCache } from "./metadata-cache.js";
import { VersionsEndpointCache } from "./versions-endpoint-cache.js";
import { Marshal } from "@qnighy/marshal";
//#region lib/modules/datasource/rubygems/index.ts
function unlessServerSide(err, cb) {
	if (err instanceof RequestError && err.response?.statusCode) {
		const code = err.response.statusCode;
		if (code >= 500 && code <= 599) return AsyncResult.err(err);
	}
	return cb();
}
var RubygemsDatasource = class RubygemsDatasource extends Datasource {
	static id = "rubygems";
	metadataCache;
	constructor() {
		super(RubygemsDatasource.id);
		this.http = new Http(RubygemsDatasource.id);
		this.versionsEndpointCache = new VersionsEndpointCache(this.http);
		this.metadataCache = new MetadataCache(this.http);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://rubygems.org"];
	}
	defaultVersioning = id;
	registryStrategy = "hunt";
	versionsEndpointCache;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created_at` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `source_code_uri` field in the results.";
	async fetchReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const registryHostname = parseUrl(registryUrl)?.hostname;
		let result;
		if (registryHostname === "rubygems.org") result = Result.wrap(this.versionsEndpointCache.getVersions(registryUrl, packageName)).transform((versions) => this.metadataCache.getRelease(registryUrl, packageName, versions));
		else if (registryHostname === "rubygems.pkg.github.com" || registryHostname === "gitlab.com") result = this.getReleasesViaDeprecatedAPI(registryUrl, packageName);
		else result = getV1Releases(this.http, registryUrl, packageName).catch((err) => unlessServerSide(err, () => this.getReleasesViaInfoEndpoint(registryUrl, packageName))).catch((err) => unlessServerSide(err, () => this.getReleasesViaDeprecatedAPI(registryUrl, packageName)));
		const { val, err } = await result.unwrap();
		if (val) return val;
		if (err instanceof Error) this.handleGenericErrors(err);
		logger.debug({
			packageName,
			registryUrl
		}, `Rubygems fetch error: ${err}`);
		return null;
	}
	getReleases(config) {
		const registryHostname = parseUrl(config.registryUrl)?.hostname;
		return this.cached({
			key: `releases:${config.registryUrl}:${config.packageName}`,
			fallback: true,
			cacheable: registryHostname === "rubygems.org"
		}, () => this.fetchReleases(config));
	}
	getReleasesViaInfoEndpoint(registryUrl, packageName) {
		const url = joinUrlParts(registryUrl, "/info", packageName);
		return Result.wrap(this.http.getText(url)).transform(({ body }) => body).parse(GemInfo);
	}
	getReleasesViaDeprecatedAPI(registryUrl, packageName) {
		const url = `${joinUrlParts(registryUrl, `/api/v1/dependencies`)}?${getQueryString({ gems: packageName })}`;
		const bufPromise = this.http.getBuffer(url);
		return Result.wrap(bufPromise).transform(({ body }) => MarshalledVersionInfo.safeParse(Marshal.parse(body)));
	}
};
//#endregion
export { RubygemsDatasource };

//# sourceMappingURL=index.js.map