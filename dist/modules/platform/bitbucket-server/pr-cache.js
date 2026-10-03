import { get, set } from "../../../util/cache/memory/index.js";
import { logger } from "../../../logger/index.js";
import { getQueryString } from "../../../util/url.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { prInfo } from "./utils.js";
import { isNullOrUndefined, isPlainObject, isString } from "@sindresorhus/is";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/modules/platform/bitbucket-server/pr-cache.ts
/* v8 ignore next -- one-off cache-schema migration shim, only runs against real legacy repo caches */
function migrateBitbucketServerCache(platform) {
	if (!isPlainObject(platform)) return;
	if (!isPlainObject(platform.bitbucketServer)) return;
	platform["bitbucket-server"] = platform.bitbucketServer;
	delete platform.bitbucketServer;
}
var BbsPrCache = class BbsPrCache {
	cache;
	items = [];
	projectKey;
	repo;
	ignorePrAuthor;
	author;
	constructor(projectKey, repo, ignorePrAuthor, author) {
		this.projectKey = projectKey;
		this.repo = repo;
		this.ignorePrAuthor = ignorePrAuthor;
		this.author = author;
		const repoCache = getCache();
		repoCache.platform ??= {};
		migrateBitbucketServerCache(repoCache.platform);
		repoCache.platform["bitbucket-server"] ??= {};
		let pullRequestCache = repoCache.platform["bitbucket-server"].pullRequestsCache;
		if (isNullOrUndefined(pullRequestCache) || pullRequestCache.author !== author) pullRequestCache = {
			items: {},
			updatedDate: null,
			author
		};
		repoCache.platform["bitbucket-server"].pullRequestsCache = pullRequestCache;
		this.cache = pullRequestCache;
		this.updateItems();
	}
	static async init(http, projectKey, repo, ignorePrAuthor, author) {
		const res = new BbsPrCache(projectKey, repo, ignorePrAuthor, author);
		// v8 ignore next -- TODO: add test #40625
		if (!get("bbs-pr-cache-synced")) {
			await res.sync(http);
			set("bbs-pr-cache-synced", true);
		}
		return res;
	}
	getPrs() {
		return this.items;
	}
	static async getPrs(http, projectKey, repo, ignorePrAuthor, author) {
		return (await BbsPrCache.init(http, projectKey, repo, ignorePrAuthor, author)).getPrs();
	}
	setPr(item) {
		this.cache.items[item.number] = item;
		this.updateItems();
	}
	static async setPr(http, projectKey, repo, ignorePrAuthor, author, item) {
		(await BbsPrCache.init(http, projectKey, repo, ignorePrAuthor, author)).setPr(item);
	}
	reconcile(rawItems) {
		logger.debug("reconciled");
		const { items } = this.cache;
		let { updatedDate } = this.cache;
		const cacheTime = updatedDate ? DateTime.fromMillis(updatedDate) : null;
		let needNextPage = true;
		for (const rawItem of rawItems) {
			const id = rawItem.id;
			const newItem = prInfo(rawItem);
			const oldItem = items[id];
			if (dequal(oldItem, newItem)) {
				needNextPage = false;
				continue;
			}
			items[id] = newItem;
			const itemTime = DateTime.fromMillis(rawItem.updatedDate);
			if (!cacheTime || itemTime > cacheTime) updatedDate = rawItem.updatedDate;
		}
		this.cache.updatedDate = updatedDate;
		return needNextPage;
	}
	async sync(http) {
		const searchParams = {
			state: "ALL",
			limit: this.items.length ? "20" : "100"
		};
		if (!this.ignorePrAuthor && isString(this.author)) {
			searchParams["role.1"] = "AUTHOR";
			searchParams["username.1"] = this.author;
		}
		let query = getQueryString(searchParams);
		while (query) {
			const res = await http.getJsonUnchecked(`./rest/api/1.0/projects/${this.projectKey}/repos/${this.repo}/pull-requests?${query}`, { memCache: false });
			if (!this.reconcile(res.body.values)) break;
			if (res.body.nextPageStart) searchParams.start = res.body.nextPageStart.toString();
			else query = null;
		}
		this.updateItems();
		return this;
	}
	/**
	* Ensure the pr cache starts with the most recent PRs.
	* JavaScript ensures that the cache is sorted by PR number.
	*/
	updateItems() {
		this.items = Object.values(this.cache.items).reverse();
	}
};
//#endregion
export { BbsPrCache };

//# sourceMappingURL=pr-cache.js.map