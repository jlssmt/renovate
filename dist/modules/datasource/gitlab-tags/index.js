import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { GitlabHttp } from "../../../util/http/gitlab.js";
import { GitlabCommit, GitlabCommits, GitlabTags } from "./schema.js";
import { defaultRegistryUrl, getDepHost, getSourceUrl } from "./util.js";
//#region lib/modules/datasource/gitlab-tags/index.ts
var GitlabTagsDatasource = class GitlabTagsDatasource extends Datasource {
	static id = "gitlab-tags";
	http;
	releaseTimestampSupport = true;
	releaseTimestampNote = "To get release timestamp we use the `created_at` field from the response.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	constructor() {
		super(GitlabTagsDatasource.id);
		this.http = new GitlabHttp(GitlabTagsDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	async fetchReleases({ registryUrl, packageName: repo }) {
		const depHost = getDepHost(registryUrl);
		const url = joinUrlParts(depHost, `api/v4/projects`, encodeURIComponent(repo), `repository/tags?per_page=100`);
		const gitlabTags = (await this.http.getJson(url, { paginate: true }, GitlabTags)).body;
		const dependency = {
			sourceUrl: getSourceUrl(repo, registryUrl),
			releases: []
		};
		dependency.releases = gitlabTags.map(({ name, commit }) => ({
			version: name,
			gitRef: name,
			releaseTimestamp: asTimestamp(commit.created_at)
		}));
		return dependency;
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${getDepHost(config.registryUrl)}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	/**
	* gitlab.getDigest
	*
	* Returs the latest commit hash of the repository.
	*/
	async fetchDigest({ packageName: repo, registryUrl }, newValue) {
		const depHost = getDepHost(registryUrl);
		const urlEncodedRepo = encodeURIComponent(repo);
		let digest = null;
		try {
			if (newValue) {
				const url = joinUrlParts(depHost, `api/v4/projects`, urlEncodedRepo, `repository/commits/`, newValue);
				digest = (await this.http.getJson(url, GitlabCommit)).body.id;
			} else {
				const url = joinUrlParts(depHost, `api/v4/projects`, urlEncodedRepo, `repository/commits?per_page=1`);
				digest = (await this.http.getJson(url, GitlabCommits)).body[0].id;
			}
		} catch (err) {
			logger.debug({
				gitlabRepo: repo,
				err,
				registryUrl
			}, "Error getting latest commit from Gitlab repo");
		}
		if (!digest) return null;
		return digest;
	}
	getDigest(config, newValue) {
		return this.cached({
			key: `getDigest:${getDepHost(config.registryUrl)}:${config.packageName}`,
			fallback: true
		}, () => this.fetchDigest(config, newValue));
	}
};
//#endregion
export { GitlabTagsDatasource };

//# sourceMappingURL=index.js.map