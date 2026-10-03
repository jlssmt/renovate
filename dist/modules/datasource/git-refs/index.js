import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { GitDatasource } from "./base.js";
//#region lib/modules/datasource/git-refs/index.ts
var GitRefsDatasource = class GitRefsDatasource extends GitDatasource {
	static id = "git-refs";
	constructor() {
		super(GitRefsDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	async _getReleases({ packageName }) {
		let rawRefs = null;
		try {
			rawRefs = await this.getRawRefs({ packageName });
		} catch (err) /* istanbul ignore next */ {
			logger.debug({ err }, "Error getting git-refs");
		}
		if (!rawRefs) return null;
		const refs = rawRefs.filter((ref) => ref.type === "tags" || ref.type === "heads").map((ref) => ref.value);
		const uniqueRefs = [...new Set(refs)];
		return {
			sourceUrl: packageName.replace(regEx(/\.git$/), "").replace(regEx(/\/$/), ""),
			releases: uniqueRefs.map((ref) => ({
				version: ref,
				gitRef: ref,
				newDigest: rawRefs.find((rawRef) => rawRef.value === ref)?.hash
			}))
		};
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GitRefsDatasource.id}`,
			key: config.packageName,
			fallback: true
		}, () => this._getReleases(config));
	}
	async getDigest({ packageName }, newValue) {
		const rawRefs = await this.getRawRefs({ packageName });
		/* v8 ignore next -- TODO: add test */
		if (!rawRefs) return null;
		let ref;
		if (newValue) ref = rawRefs.find((rawRef) => ["heads", "tags"].includes(rawRef.type) && rawRef.value === newValue);
		else ref = rawRefs.find((rawRef) => rawRef.type === "" && rawRef.value === "HEAD");
		if (ref) return ref.hash;
		return null;
	}
};
//#endregion
export { GitRefsDatasource };

//# sourceMappingURL=index.js.map