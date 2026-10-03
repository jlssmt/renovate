import { joinUrlParts } from "../../../util/url.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { GitlabHttp } from "../../../util/http/gitlab.js";
import { datasource } from "./common.js";
//#region lib/modules/datasource/gitlab-packages/index.ts
var GitlabPackagesDatasource = class GitlabPackagesDatasource extends Datasource {
	static id = datasource;
	http;
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://gitlab.com"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created_at` field in the results.";
	constructor() {
		super(datasource);
		this.http = new GitlabHttp(datasource);
	}
	static getGitlabPackageApiUrl(registryUrl, projectName, packageName) {
		return joinUrlParts(registryUrl, `api/v4/projects`, encodeURIComponent(projectName), `packages?package_name=${encodeURIComponent(packageName)}&per_page=100`);
	}
	async fetchReleases({ registryUrl, packageName }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const [projectPart, packagePart] = packageName.split(":", 2);
		const apiUrl = GitlabPackagesDatasource.getGitlabPackageApiUrl(registryUrl, projectPart, packagePart);
		const result = { releases: [] };
		let response;
		try {
			response = (await this.http.getJsonUnchecked(apiUrl, { paginate: true })).body;
			result.releases = response.filter((r) => (r.conan_package_name ?? r.name) === packagePart).map(({ version, created_at }) => ({
				version,
				releaseTimestamp: asTimestamp(created_at)
			}));
		} catch (err) {
			this.handleGenericErrors(err);
		}
		return result.releases?.length ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}-${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { GitlabPackagesDatasource };

//# sourceMappingURL=index.js.map