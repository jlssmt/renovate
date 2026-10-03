import { TEMPORARY_ERROR } from "../../../constants/error-messages.js";
import { get, set } from "../../../util/cache/memory/index.js";
import { logger } from "../../../logger/index.js";
import { getQueryString, parseLinkHeader, parseUrl } from "../../../util/url.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { PRList } from "./schema.js";
import { API_PATH, toRenovatePR } from "./utils.js";
import { isNullOrUndefined } from "@sindresorhus/is";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/modules/platform/gitea/pr-cache.ts
function syncedCacheKey(platform) {
	return `${platform}-pr-cache-synced`;
}
/**
* The PRs of a single repository, backed by the repository cache.
*/
var RepoPrCache = class {
	http;
	platform;
	cache;
	items = [];
	repo;
	ignorePrAuthor;
	author;
	constructor(http, platform, { repo, ignorePrAuthor, author }) {
		this.http = http;
		this.platform = platform;
		this.repo = repo;
		this.ignorePrAuthor = ignorePrAuthor;
		this.author = author;
		const repoCache = getCache();
		repoCache.platform ??= {};
		const platformCache = repoCache.platform[platform] ??= {};
		let pullRequestCache = platformCache.pullRequestsCache;
		if (isNullOrUndefined(pullRequestCache) || pullRequestCache.author !== author) pullRequestCache = {
			items: {},
			updated_at: null,
			author
		};
		platformCache.pullRequestsCache = pullRequestCache;
		this.cache = pullRequestCache;
		this.updateItems();
	}
	get prs() {
		return this.items;
	}
	setPr(item) {
		this.cache.items[item.number] = item;
		this.updateItems();
	}
	reconcile(rawItems) {
		const { items } = this.cache;
		let { updated_at } = this.cache;
		const cacheTime = updated_at ? DateTime.fromISO(updated_at) : null;
		let needNextPage = true;
		for (const rawItem of rawItems) {
			if (!rawItem) {
				logger.warn({ platform: this.platform }, "PR is empty, throwing temporary error");
				throw new Error(TEMPORARY_ERROR);
			}
			const id = rawItem.number;
			const newItem = toRenovatePR(rawItem, this.author);
			if (!newItem) continue;
			const oldItem = items[id];
			if (dequal(oldItem, newItem)) {
				needNextPage = false;
				continue;
			}
			items[id] = newItem;
			const itemTime = DateTime.fromISO(rawItem.updated_at);
			if (!cacheTime || itemTime > cacheTime) updated_at = rawItem.updated_at;
		}
		this.cache.updated_at = updated_at;
		return needNextPage;
	}
	async sync() {
		let query = getQueryString({
			state: "all",
			sort: "recentupdate",
			limit: this.items.length ? 20 : 100,
			...this.ignorePrAuthor ? {} : { poster: this.author }
		});
		while (query) {
			const res = await this.http.getJson(`${API_PATH}/repos/${this.repo}/pulls?${query}`, {
				memCache: false,
				paginate: false
			}, PRList);
			if (!this.reconcile(res.body)) break;
			const uri = parseUrl(parseLinkHeader(res.headers.link)?.next?.url);
			query = uri ? uri.search : null;
		}
		this.updateItems();
	}
	/**
	* Ensure the pr cache starts with the most recent PRs.
	* JavaScript ensures that the cache is sorted by PR number.
	*/
	updateItems() {
		this.items = Object.values(this.cache.items).reverse();
	}
};
/**
* PR cache of one platform. `initRepo()` records the repository, the
* repository cache itself is bound on first use because it is initialized
* after `platform.initRepo()`.
*/
var GiteaPrCache = class {
	http;
	platform;
	repoOptions = null;
	repoCache = null;
	constructor(http, platform) {
		this.http = http;
		this.platform = platform;
	}
	initRepo(repo, ignorePrAuthor, author) {
		this.repoOptions = {
			repo,
			ignorePrAuthor,
			author
		};
		this.repoCache = null;
	}
	reset() {
		this.repoOptions = null;
		this.repoCache = null;
	}
	forceSync() {
		set(syncedCacheKey(this.platform), false);
	}
	async open() {
		if (!this.repoOptions) throw new Error("PR cache used before initRepo()");
		this.repoCache ??= new RepoPrCache(this.http, this.platform, this.repoOptions);
		if (!get(syncedCacheKey(this.platform))) {
			await this.repoCache.sync();
			set(syncedCacheKey(this.platform), true);
		}
		return this.repoCache;
	}
	async getPrs() {
		return (await this.open()).prs;
	}
	async setPr(item) {
		(await this.open()).setPr(item);
	}
};
//#endregion
export { GiteaPrCache };

//# sourceMappingURL=pr-cache.js.map