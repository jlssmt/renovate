import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { Timestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { datasource, defaultRegistryUrl } from "./common.js";
import { getReleases } from "./prefix-dev.js";
import { CondaPackage } from "./schema.js";
//#region lib/modules/datasource/conda/index.ts
var CondaDatasource = class extends Datasource {
	static id = datasource;
	constructor() {
		super(datasource);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "hunt";
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `upload_time` field of the files of a version when using the Anaconda.org API, or from the `createdAt` field of the variants of a version when using prefix.dev. All files of a version are assumed to be published at roughly the same time.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `dev_url` field in the results.";
	async fetchReleases({ registryUrl, packageName }) {
		logger.trace({
			registryUrl,
			packageName
		}, "fetching conda package");
		if (!registryUrl) return null;
		if (registryUrl.startsWith("https://prefix.dev/") || registryUrl.startsWith("https://fast.prefix.dev/")) {
			const channel = ensureTrailingSlash(registryUrl).split("/").at(-2);
			return getReleases(this.http, channel, packageName);
		}
		const url = joinUrlParts(registryUrl, packageName);
		const result = { releases: [] };
		try {
			const response = await this.http.getJson(url, CondaPackage);
			result.homepage = response.body.html_url;
			result.sourceUrl = response.body.dev_url;
			const releaseDate = {};
			for (const file of coerceArray(response.body.files)) releaseDate[file.version] ??= Timestamp.parse(file.upload_time);
			coerceArray(response.body.versions).forEach((version) => {
				const thisRelease = {
					version,
					releaseTimestamp: releaseDate[version]
				};
				result.releases.push(thisRelease);
			});
		} catch (err) {
			if (err instanceof RequestError && err.response?.statusCode !== 404) throw new ExternalHostError(err);
			this.handleGenericErrors(err);
		}
		return result.releases.length ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { CondaDatasource };

//# sourceMappingURL=index.js.map