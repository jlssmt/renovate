import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/python/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { registryUrl } from "../endoflife-date/common.js";
import { EndoflifeDateDatasource } from "../endoflife-date/index.js";
import { GithubReleasesDatasource } from "../github-releases/index.js";
import { datasource, defaultRegistryUrl, githubBaseUrl } from "./common.js";
import { PythonRelease } from "./schema.js";
//#region lib/modules/datasource/python-version/index.ts
var PythonVersionDatasource = class extends Datasource {
	static id = datasource;
	pythonPrebuildDatasource;
	pythonEolDatasource;
	constructor() {
		super(datasource);
		this.pythonPrebuildDatasource = new GithubReleasesDatasource();
		this.pythonEolDatasource = new EndoflifeDateDatasource();
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	defaultVersioning = id;
	async getPrebuildReleases() {
		return await this.pythonPrebuildDatasource.getReleases({
			registryUrl: githubBaseUrl,
			packageName: "containerbase/python-prebuild"
		});
	}
	async getEolReleases() {
		return await this.pythonEolDatasource.getReleases({
			registryUrl,
			packageName: "python"
		});
	}
	async fetchReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const pythonPrebuildReleases = await this.getPrebuildReleases();
		const pythonPrebuildVersions = new Set(pythonPrebuildReleases?.releases.map((release) => release.version));
		const pythonEolReleases = await this.getEolReleases();
		const pythonEolVersions = new Map(pythonEolReleases?.releases.filter((release) => release.isDeprecated !== void 0).map((release) => [release.version.split(".").slice(0, 2).join("."), release.isDeprecated]));
		const result = {
			homepage: "https://python.org",
			sourceUrl: "https://github.com/python/cpython",
			registryUrl,
			releases: []
		};
		try {
			const response = await this.http.getJson(registryUrl, PythonRelease);
			result.releases.push(...response.body.filter((release) => release.isStable).filter((release) => pythonPrebuildVersions.has(release.version)));
		} catch (err) {
			if (err instanceof RequestError && err.response?.statusCode === 429) {
				logger.debug({ err }, "Rate limited by python.org, using prebuild releases");
				result.releases.push(...coerceArray(pythonPrebuildReleases?.releases));
			} else this.handleGenericErrors(err);
		}
		for (const release of result.releases) release.isDeprecated = pythonEolVersions.get(release.version.split(".").slice(0, 2).join("."));
		return result.releases.length ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { PythonVersionDatasource };

//# sourceMappingURL=index.js.map