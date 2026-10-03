import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { BitbucketTagsDatasource } from "../bitbucket-tags/index.js";
import { GiteaTagsDatasource } from "../gitea-tags/index.js";
import { ForgejoTagsDatasource } from "../forgejo-tags/index.js";
import { GitTagsDatasource } from "../git-tags/index.js";
import { GithubTagsDatasource } from "../github-tags/index.js";
import { GitlabTagsDatasource } from "../gitlab-tags/index.js";
import { BaseGoDatasource } from "./base.js";
import { getSourceUrl, isPublicGoPackage } from "./common.js";
//#region lib/modules/datasource/go/releases-direct.ts
/**
* This function tries to select tags with longest prefix could be constructed from `packageName`.
*
* For package named `example.com/foo/bar/baz/qux`, it will try to detect tags with following prefixes:
*
*   - `foo/bar/baz/qux/vX.Y.Z`
*   - `bar/baz/qux/vX.Y.Z`
*   - `baz/qux/vX.Y.Z`
*   - `qux/vX.Y.Z`
*
* If none of the following is found, it falls back to simply returning all tags like `vX.Y.Z`.
*/
function filterByPrefix(packageName, releases) {
	const nameParts = packageName.replace(regEx(/\/v\d+$/), "").split("/").slice(1);
	const submoduleReleases = [];
	while (nameParts.length) {
		const prefix = `${nameParts.join("/")}/`;
		for (const release of releases) {
			if (!release.version.startsWith(prefix)) continue;
			if (!release.version.replace(prefix, "").match(regEx(/^v\d[^/]*/))) continue;
			release.version = release.version.replace(prefix, "");
			submoduleReleases.push(release);
		}
		if (submoduleReleases.length) return submoduleReleases;
		nameParts.shift();
	}
	return releases.filter((release) => release.version.startsWith("v"));
}
var GoDirectDatasource = class GoDirectDatasource extends Datasource {
	static id = "go-direct";
	forgejo = new ForgejoTagsDatasource();
	git;
	gitea = new GiteaTagsDatasource();
	github;
	gitlab;
	bitbucket;
	constructor() {
		super(GoDirectDatasource.id);
		this.git = new GitTagsDatasource();
		this.github = new GithubTagsDatasource();
		this.gitlab = new GitlabTagsDatasource();
		this.bitbucket = new BitbucketTagsDatasource();
	}
	/**
	* go.getReleases
	*
	* This datasource resolves a go module URL into its source repository
	*  and then fetch it if it is on GitHub.
	*
	* This function will:
	*  - Determine the source URL for the module
	*  - Call the respective getReleases in github/gitlab to retrieve the tags
	*  - Filter module tags according to the module path
	*/
	async _getReleases(config) {
		const { packageName } = config;
		let res = null;
		logger.trace(`go.getReleases(${packageName})`);
		const source = await BaseGoDatasource.getDatasource(packageName);
		if (!source) {
			logger.info({ packageName }, "Unsupported go host - cannot look up versions");
			return null;
		}
		switch (source.datasource) {
			case ForgejoTagsDatasource.id:
				res = await this.forgejo.getReleases(source);
				break;
			case GitTagsDatasource.id:
				res = await this.git.getReleases(source);
				break;
			case GiteaTagsDatasource.id:
				res = await this.gitea.getReleases(source);
				break;
			case GithubTagsDatasource.id:
				res = await this.github.getReleases(source);
				break;
			case GitlabTagsDatasource.id:
				res = await this.gitlab.getReleases(source);
				break;
			case BitbucketTagsDatasource.id:
				res = await this.bitbucket.getReleases(source);
				break;
			/* v8 ignore next -- should never happen */
			default: return null;
		}
		/* v8 ignore next -- TODO: add test */
		if (!res) return null;
		const sourceUrl = res.sourceUrl ?? getSourceUrl(source) ?? null;
		return {
			...res,
			releases: filterByPrefix(packageName, res.releases),
			sourceUrl
		};
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GoDirectDatasource.id}`,
			key: config.packageName,
			cacheable: isPublicGoPackage(config.packageName),
			fallback: true
		}, () => this._getReleases(config));
	}
};
//#endregion
export { GoDirectDatasource };

//# sourceMappingURL=releases-direct.js.map