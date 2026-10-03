import { regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { id } from "../../versioning/hermit/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { streamToString } from "../../../util/streams.js";
import { getApiBaseUrl } from "../../../util/github/url.js";
//#region lib/modules/datasource/hermit/index.ts
/**
* Hermit Datasource searches a given package from the specified `hermit-packages`
* repository. It expects the search manifest to come from an asset `index.json` from
* a release named index.
*/
var HermitDatasource = class HermitDatasource extends Datasource {
	static id = "hermit";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "first";
	defaultVersioning = id;
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com/cashapp/hermit-packages"];
	}
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `Repository` field in the results.";
	pathRegex;
	constructor() {
		super(HermitDatasource.id);
		this.http = new GithubHttp(id);
		this.pathRegex = regEx("^/(?<owner>[^/]+)/(?<repo>[^/]+)$");
	}
	async _getReleases({ packageName, registryUrl }) {
		logger.trace(`HermitDataSource.getReleases()`);
		if (!registryUrl) {
			logger.error("registryUrl must be supplied");
			return null;
		}
		const parsedUrl = parseUrl(registryUrl);
		if (parsedUrl === null) {
			logger.warn({ registryUrl }, "invalid registryUrl given");
			return null;
		}
		if (!registryUrl.startsWith("https://github.com/")) {
			logger.warn({ registryUrl }, "Only Github registryUrl is supported");
			return null;
		}
		const items = await this.getHermitSearchManifest(parsedUrl);
		if (items === null) return null;
		const res = items.find((i) => i.Name === packageName);
		if (!res) {
			logger.debug(`Could not find hermit package ${packageName} at URL ${registryUrl}`);
			return null;
		}
		const sourceUrl = res.Repository;
		return {
			sourceUrl,
			releases: [...res.Versions.map((v) => ({
				version: v,
				sourceUrl
			})), ...res.Channels.map((v) => ({
				version: v,
				sourceUrl
			}))]
		};
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${HermitDatasource.id}`,
			key: `getReleases:${config.registryUrl ?? ""}-${config.packageName}`,
			fallback: true
		}, () => this._getReleases(config));
	}
	/**
	* getHermitSearchManifest fetch the index.json from release
	* named index, parses it and returned the parsed JSON result
	*/
	async _getHermitSearchManifest(u) {
		const registryUrl = u.toString();
		const host = coerceString(u.host);
		const groups = this.pathRegex.exec(coerceString(u.pathname))?.groups;
		if (!groups) {
			logger.warn({ registryUrl }, "failed to get owner and repo from given url");
			return null;
		}
		const { owner, repo } = groups;
		const apiBaseUrl = getApiBaseUrl(`https://${host}`);
		const asset = (await this.http.getJsonUnchecked(`${apiBaseUrl}repos/${owner}/${repo}/releases/tags/index`)).body.assets.find((asset) => asset.name === "index.json");
		if (!asset) {
			logger.warn({ registryUrl }, `can't find asset index.json in the given registryUrl`);
			return null;
		}
		const indexContent = await streamToString(this.http.stream(asset.url, { headers: { accept: "application/octet-stream" } }));
		try {
			return JSON.parse(indexContent);
		} catch {
			logger.warn("error parsing hermit search manifest from remote respond");
		}
		return null;
	}
	getHermitSearchManifest(u) {
		return withCache({
			namespace: `datasource-${HermitDatasource.id}`,
			key: `getHermitSearchManifest:${u.toString()}`
		}, () => this._getHermitSearchManifest(u));
	}
};
//#endregion
export { HermitDatasource };

//# sourceMappingURL=index.js.map