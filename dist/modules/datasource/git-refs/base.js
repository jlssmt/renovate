import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { getRemoteUrlWithToken } from "../../../util/git/url.js";
import { createSimpleGit } from "../../../util/git/index.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/datasource/git-refs/base.ts
const refMatch = regEx(/(?<hash>.*?)\s+refs\/(?<type>.*?)\/(?<value>.*)/);
const headMatch = regEx(/(?<hash>.*?)\s+HEAD/);
const gitId = "git";
var GitDatasource = class extends Datasource {
	static id = gitId;
	constructor(id) {
		super(id);
	}
	async _getRawRefs({ packageName }) {
		const lsRemote = await createSimpleGit({ authentication: { hostTypes: [this.id] } }).listRemote([getRemoteUrlWithToken(packageName, this.id)]);
		if (!lsRemote) return null;
		const allRefs = lsRemote.trim().split(newlineRegex).map((line) => line.trim()).map((line) => {
			let match = refMatch.exec(line);
			if (match?.groups) return {
				type: match.groups.type,
				value: match.groups.value,
				hash: match.groups.hash
			};
			match = headMatch.exec(line);
			if (match?.groups) return {
				type: "",
				value: "HEAD",
				hash: match.groups.hash
			};
			logger.trace(`malformed ref: ${line}`);
			return null;
		}).filter(isTruthy).filter((ref) => ref.type !== "pull");
		const dereferencedTags = {};
		for (const ref of allRefs) if (ref.value.endsWith("^{}")) dereferencedTags[ref.value.slice(0, -3)] = ref.hash;
		return allRefs.filter((ref) => !ref.value.endsWith("^{}")).map((ref) => {
			const dereferencedHash = dereferencedTags[ref.value];
			if (dereferencedHash) return {
				...ref,
				hash: dereferencedHash
			};
			return ref;
		});
	}
	getRawRefs(config) {
		return withCache({
			namespace: `datasource-${gitId}`,
			key: config.packageName
		}, () => this._getRawRefs(config));
	}
};
//#endregion
export { GitDatasource };

//# sourceMappingURL=base.js.map