import { regEx } from "../../../util/regex.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { GitDatasource } from "../git-refs/base.js";
//#region lib/modules/datasource/git-tags/index.ts
var GitTagsDatasource = class GitTagsDatasource extends GitDatasource {
	static id = "git-tags";
	constructor() {
		super(GitTagsDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	async _getReleases({ packageName }) {
		const rawRefs = await this.getRawRefs({ packageName });
		if (rawRefs === null) return null;
		const releases = rawRefs.filter((ref) => ref.type === "tags").map((ref) => ({
			version: ref.value,
			gitRef: ref.value,
			newDigest: ref.hash
		}));
		return {
			sourceUrl: packageName.replace(regEx(/\.git$/), "").replace(regEx(/\/$/), ""),
			releases
		};
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GitTagsDatasource.id}`,
			key: config.packageName,
			fallback: true
		}, () => this._getReleases(config));
	}
	async getDigest({ packageName }, newValue) {
		const rawRefs = await this.getRawRefs({ packageName });
		const findValue = newValue ?? "HEAD";
		const ref = rawRefs?.find((rawRef) => rawRef.value === findValue);
		if (ref) return ref.hash;
		return null;
	}
};
//#endregion
export { GitTagsDatasource };

//# sourceMappingURL=index.js.map