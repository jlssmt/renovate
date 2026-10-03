import { hash } from "../../util/hash.js";
import { getCache } from "../../util/cache/repository/index.js";
import { platform } from "./index.js";
//#region lib/modules/platform/comment.ts
async function ensureComment(commentConfig) {
	const { number, content } = commentConfig;
	const topic = commentConfig.topic ?? "";
	const contentHash = hash(content);
	const repoCache = getCache();
	if (contentHash !== repoCache.prComments?.[number]?.[topic]) {
		const res = await platform.ensureComment(commentConfig);
		if (res) {
			repoCache.prComments ??= {};
			repoCache.prComments[number] ??= {};
			repoCache.prComments[number][topic] = contentHash;
		}
		return res;
	}
	return true;
}
async function ensureCommentRemoval(config) {
	await platform.ensureCommentRemoval(config);
	const repoCache = getCache();
	const { type, number } = config;
	// v8 ignore else -- TODO: add test #40625
	if (repoCache.prComments?.[number]) {
		// v8 ignore else -- TODO: add test #40625
		if (type === "by-topic") delete repoCache.prComments?.[number]?.[config.topic];
		else if (type === "by-content") {
			const contentHash = hash(config.content);
			for (const [cachedTopic, cachedContentHash] of Object.entries(repoCache.prComments?.[number]))
 // v8 ignore else -- TODO: add test #40625
			if (cachedContentHash === contentHash) {
				delete repoCache.prComments?.[number]?.[cachedTopic];
				return;
			}
		}
	}
}
//#endregion
export { ensureComment, ensureCommentRemoval };

//# sourceMappingURL=comment.js.map