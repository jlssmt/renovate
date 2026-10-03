import { get, set } from "../../../util/cache/memory/index.js";
import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { prFieldsFilter, prInfo, prStates } from "./utils.js";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/modules/platform/bitbucket/pr-cache.ts
var BitbucketPrCache = class BitbucketPrCache {
	items = [];
	cache;
	repo;
	author;
	constructor(repo, author) {
		this.repo = repo;
		this.author = author;
		const repoCache = getCache();
		repoCache.platform ??= {};
		repoCache.platform.bitbucket ??= {};
		let pullRequestCache = repoCache.platform.bitbucket.pullRequestsCache;
		if (!pullRequestCache) {
			logger.debug("Initializing new PR cache at repository cache");
			pullRequestCache = {
				items: {},
				updated_on: null,
				author
			};
		} else if (pullRequestCache.author !== author) {
			logger.debug("Resetting PR cache because authors do not match");
			pullRequestCache = {
				items: {},
				updated_on: null,
				author
			};
		}
		repoCache.platform.bitbucket.pullRequestsCache = pullRequestCache;
		this.cache = pullRequestCache;
		this.updateItems();
	}
	static async init(http, repo, author) {
		const res = new BitbucketPrCache(repo, author);
		if (!get("bitbucket-pr-cache-synced")) {
			await res.sync(http);
			set("bitbucket-pr-cache-synced", true);
		}
		return res;
	}
	getPrs() {
		return this.items;
	}
	static async getPrs(http, repo, author) {
		return (await BitbucketPrCache.init(http, repo, author)).getPrs();
	}
	setPr(pr) {
		logger.debug(`Adding PR #${pr.number} to the PR cache`);
		this.cache.items[pr.number] = pr;
		this.updateItems();
	}
	static async setPr(http, repo, author, item) {
		(await BitbucketPrCache.init(http, repo, author)).setPr(item);
	}
	reconcile(rawItems) {
		const { items: oldItems } = this.cache;
		let { updated_on } = this.cache;
		for (const rawItem of rawItems) {
			const id = rawItem.id;
			const oldItem = oldItems[id];
			const newItem = prInfo(rawItem);
			const itemNewTime = DateTime.fromISO(rawItem.updated_on);
			if (!dequal(oldItem, newItem)) oldItems[id] = newItem;
			const cacheOldTime = updated_on ? DateTime.fromISO(updated_on) : null;
			// v8 ignore else -- TODO: add test #40625
			if (!cacheOldTime || itemNewTime > cacheOldTime) updated_on = rawItem.updated_on;
		}
		this.cache.updated_on = updated_on;
	}
	getUrl() {
		const params = new URLSearchParams();
		for (const state of prStates.all) params.append("state", state);
		params.append("fields", prFieldsFilter);
		const q = [];
		if (this.author) q.push(`author.uuid = "${this.author}"`);
		if (this.cache.updated_on) q.push(`updated_on > "${this.cache.updated_on}"`);
		params.append("q", q.join(" AND "));
		const query = params.toString();
		return `/2.0/repositories/${this.repo}/pullrequests?${query}`;
	}
	async sync(http) {
		logger.debug("Syncing PR list");
		const url = this.getUrl();
		const opts = {
			paginate: true,
			pagelen: 50,
			cacheProvider: repoCacheProvider
		};
		const items = (await http.getJsonUnchecked(url, opts)).body.values;
		logger.debug(`Fetched ${items.length} PRs to sync with cache`);
		const oldCache = clone(this.cache.items);
		this.reconcile(items);
		logger.debug(`Total PRs cached: ${Object.values(this.cache.items).length}`);
		logger.trace({
			items,
			oldCache,
			newCache: this.cache.items
		}, `PR cache sync finished`);
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
export { BitbucketPrCache };

//# sourceMappingURL=pr-cache.js.map