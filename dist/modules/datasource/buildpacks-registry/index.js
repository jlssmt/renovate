import { logger } from "../../../logger/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Result } from "../../../util/result.js";
import { Datasource } from "../datasource.js";
import { ReleasesConfig } from "../schema.js";
import { BuildpacksRegistryResponse } from "./schema.js";
import { ZodError } from "zod/v4";
import urlJoin from "url-join";
//#region lib/modules/datasource/buildpacks-registry/index.ts
var BuildpacksRegistryDatasource = class BuildpacksRegistryDatasource extends Datasource {
	static id = "buildpacks-registry";
	constructor() {
		super(BuildpacksRegistryDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://registry.buildpacks.io"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `published_at` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `source_code_url` field of the release object in the results.";
	async _getReleases(config) {
		const { val, err } = await Result.parse(config, ReleasesConfig).transform(({ packageName, registryUrl }) => {
			const url = urlJoin(registryUrl, "api", "v1", "buildpacks", packageName);
			return this.http.getJsonSafe(url, BuildpacksRegistryResponse);
		}).transform(({ versions, latest }) => {
			const res = { releases: versions };
			if (latest?.homepage) res.homepage = latest.homepage;
			return res;
		}).unwrap();
		if (err instanceof ZodError) {
			logger.debug({ err }, "buildpacks: validation error");
			return null;
		}
		if (err) this.handleGenericErrors(err);
		return val;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${BuildpacksRegistryDatasource.id}`,
			key: `${config.registryUrl}:${config.packageName}`,
			cacheable: true,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { BuildpacksRegistryDatasource };

//# sourceMappingURL=index.js.map