import { id } from "../../versioning/exact/index.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { getSourceUrl } from "../../../util/github/url.js";
import { queryBranches, queryTags } from "../../../util/github/graphql/index.js";
//#region lib/modules/datasource/github-digest/index.ts
var GithubDigestDatasource = class GithubDigestDatasource extends Datasource {
	static id = "github-digest";
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com"];
	}
	registryStrategy = "hunt";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the commit date.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	defaultVersioning = id;
	http;
	constructor() {
		super(GithubDigestDatasource.id);
		this.http = new GithubHttp(GithubDigestDatasource.id);
	}
	static getCacheKey(registryUrl, packageName, suffix) {
		return `${registryUrl}:${packageName}:${suffix}`;
	}
	getReleases(config) {
		const { registryUrl, packageName: repo } = config;
		const sourceUrl = getSourceUrl(repo, registryUrl);
		return this.cached({ key: GithubDigestDatasource.getCacheKey(registryUrl, repo, "releases") }, async () => {
			const [tagsSettled, branchesSettled] = await Promise.allSettled([queryTags(config, this.http), queryBranches(config, this.http)]);
			if (tagsSettled.status === "rejected") throw tagsSettled.reason;
			if (branchesSettled.status === "rejected") throw branchesSettled.reason;
			const tagsResult = tagsSettled.value;
			const branchesResult = branchesSettled.value;
			const releases = tagsResult.map(({ version, releaseTimestamp, gitRef, hash }) => ({
				version,
				releaseTimestamp,
				gitRef,
				newDigest: hash
			}));
			const tagVersions = new Set(tagsResult.map((t) => t.version));
			for (const { version, releaseTimestamp, gitRef, hash } of branchesResult) if (!tagVersions.has(version)) releases.push({
				version,
				releaseTimestamp,
				gitRef,
				newDigest: hash
			});
			return {
				sourceUrl,
				releases
			};
		});
	}
	async getDigest({ packageName: repo, registryUrl }, newValue) {
		if (!newValue) return null;
		return await this.cached({ key: GithubDigestDatasource.getCacheKey(registryUrl, repo, `digest:${newValue}`) }, async () => {
			const config = {
				packageName: repo,
				registryUrl
			};
			const tagItem = (await queryTags(config, this.http)).find(({ version }) => version === newValue);
			if (tagItem?.hash) return tagItem.hash;
			const branchItem = (await queryBranches(config, this.http)).find(({ version }) => version === newValue);
			if (branchItem?.hash) return branchItem.hash;
			return null;
		});
	}
};
//#endregion
export { GithubDigestDatasource };

//# sourceMappingURL=index.js.map