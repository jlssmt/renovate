import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/pep440/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { GalaxyV1 } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/galaxy/index.ts
var GalaxyDatasource = class GalaxyDatasource extends Datasource {
	static id = "galaxy";
	constructor() {
		super(GalaxyDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://galaxy.ansible.com/"];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `github_user` and `github_repo` fields in the results.";
	async _getReleases({ packageName, registryUrl }) {
		const lookUp = packageName.split(".");
		const userName = lookUp[0];
		const projectName = lookUp[1];
		const galaxyAPIUrl = `${registryUrl}api/v1/roles/?owner__username=${userName}&name=${projectName}`;
		const galaxyProjectUrl = `${registryUrl}${userName}/${projectName}`;
		let body = null;
		try {
			body = (await this.http.getJson(galaxyAPIUrl, GalaxyV1)).body;
		} catch (err) {
			this.handleGenericErrors(err);
		}
		if (body.results.length > 1) {
			body.results = body.results.filter((result) => result.github_user === userName);
			if (!body.results.length) {
				logger.warn({
					dependency: packageName,
					userName
				}, `No matching result from galaxy for package`);
				return null;
			}
		}
		if (body.results.length === 0) {
			logger.debug(`Received no results for ${packageName} from ${galaxyAPIUrl} `);
			return null;
		}
		const resultObject = body.results[0];
		const versions = resultObject.summary_fields.versions;
		const result = { releases: [] };
		result.dependencyUrl = galaxyProjectUrl;
		const { github_user: user, github_repo: repo } = resultObject;
		if (isNonEmptyString(user) && isNonEmptyString(repo)) result.sourceUrl = `https://github.com/${user}/${repo}`;
		result.releases = versions.map(({ version, releaseTimestamp }) => {
			const release = { version };
			if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
			return release;
		});
		return result;
	}
	getReleases(config) {
		return withCache({
			namespace: "datasource-galaxy",
			key: config.packageName,
			cacheable: true,
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { GalaxyDatasource };

//# sourceMappingURL=index.js.map