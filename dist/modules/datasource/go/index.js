import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { id } from "../../versioning/semver/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { BitbucketTagsDatasource } from "../bitbucket-tags/index.js";
import { GiteaTagsDatasource } from "../gitea-tags/index.js";
import { ForgejoTagsDatasource } from "../forgejo-tags/index.js";
import { GitTagsDatasource } from "../git-tags/index.js";
import { GithubTagsDatasource } from "../github-tags/index.js";
import { GitlabTagsDatasource } from "../gitlab-tags/index.js";
import { BaseGoDatasource } from "./base.js";
import { parseGoproxy } from "./goproxy-parser.js";
import { isPublicGoPackage } from "./common.js";
import { GoDirectDatasource } from "./releases-direct.js";
import { GoProxyDatasource } from "./releases-goproxy.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/datasource/go/index.ts
var GoDatasource = class GoDatasource extends Datasource {
	static id = "go";
	defaultVersioning = id;
	constructor() {
		super(GoDatasource.id);
	}
	defaultConfig = { commitMessageTopic: "module {{depName}}" };
	supportsCustomRegistry(_packageName) {
		return false;
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "If the release timestamp is not returned from the respective datasoure used to fetch the releases, then Renovate uses the `Time` field in the results instead. For modules hosted on GitHub, a later GitHub Release publication time takes precedence over both.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `packageName` and `registryUrl`.";
	goproxy = new GoProxyDatasource();
	direct = new GoDirectDatasource();
	static pversionRegexp = regEx(/v\d+\.\d+\.\d+-(?:\w+\.)?(?:0\.)?\d{14}-(?<digest>[a-f0-9]{12})/);
	_getReleases(config) {
		return this.goproxy.getReleases(config);
	}
	getReleases(config) {
		const constraintsFilteringKey = config.constraintsFiltering && config.constraintsFiltering !== "none" ? `@@${config.constraintsFiltering}` : "";
		return withCache({
			namespace: `datasource-${GoDatasource.id}`,
			key: `getReleases:${config.packageName}@@${constraintsFilteringKey}`,
			cacheable: isPublicGoPackage(config.packageName),
			fallback: true
		}, () => this._getReleases(config));
	}
	/**
	* go.getDigest
	*
	* This datasource resolves a go module URL into its source repository
	*  and then fetches the digest if it is on GitHub.
	*
	* This function will:
	*  - Determine the source URL for the module
	*  - Call the respective getDigest in github to retrieve the commit hash
	*/
	async _getDigest({ packageName }, newValue) {
		if (parseGoproxy().some(({ url }) => url === "off")) {
			logger.debug(`Skip digest fetch for ${packageName} with GOPROXY containing "off"`);
			return null;
		}
		const source = await BaseGoDatasource.getDatasource(packageName);
		if (!source) return null;
		const tag = newValue && !GoDatasource.pversionRegexp.test(newValue) && newValue !== "v0.0.0" ? newValue : void 0;
		switch (source.datasource) {
			case ForgejoTagsDatasource.id: return this.direct.forgejo.getDigest(source, tag);
			case GitTagsDatasource.id: return this.direct.git.getDigest(source, tag);
			case GiteaTagsDatasource.id: return this.direct.gitea.getDigest(source, tag);
			case GithubTagsDatasource.id: return this.direct.github.getDigest(source, tag);
			case BitbucketTagsDatasource.id: return this.direct.bitbucket.getDigest(source, tag);
			case GitlabTagsDatasource.id: return this.direct.gitlab.getDigest(source, tag);
			/* v8 ignore next: can never happen, makes lint happy */
			default: return null;
		}
	}
	getDigest(config, newValue) {
		return withCache({
			namespace: `datasource-${GoDatasource.id}`,
			key: `getDigest:${config.packageName}:${newValue}`,
			cacheable: isPublicGoPackage(config.packageName),
			fallback: true
		}, () => this._getDigest(config, newValue));
	}
};
const env = getEnv();
/* v8 ignore if -- hard to test */
if (isString(env.GOPROXY)) {
	const uri = parseUrl(env.GOPROXY);
	if (uri?.password) addSecretForSanitizing(uri.password, "global");
	else if (uri?.username) addSecretForSanitizing(uri.username, "global");
}
//#endregion
export { GoDatasource };

//# sourceMappingURL=index.js.map