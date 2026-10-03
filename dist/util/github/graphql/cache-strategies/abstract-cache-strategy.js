import { isDateExpired } from "../util.js";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/util/github/graphql/cache-strategies/abstract-cache-strategy.ts
/**
* Cache strategy handles the caching Github GraphQL items
* and reconciling them with newly obtained ones from paginated queries.
*/
var AbstractGithubGraphqlCacheStrategy = class AbstractGithubGraphqlCacheStrategy {
	/**
	* Time period after which a cache record is considered expired.
	*/
	static cacheTTLDays = 30;
	/**
	* The time which is used during single cache access cycle.
	*/
	now = DateTime.now().toUTC();
	/**
	* Set of all versions which were reconciled
	* during the current cache access cycle.
	*/
	reconciledVersions;
	/**
	* These fields will be persisted.
	*/
	items;
	createdAt = this.now;
	/**
	* This flag indicates whether there is any new or updated items
	*/
	hasNovelty = false;
	cacheNs;
	cacheKey;
	skipStabilization;
	constructor(cacheNs, cacheKey, skipStabilization = false) {
		this.cacheNs = cacheNs;
		this.cacheKey = cacheKey;
		this.skipStabilization = skipStabilization;
	}
	/**
	* Load data previously persisted by this strategy
	* for given `cacheNs` and `cacheKey`.
	*/
	async getItems() {
		if (this.items) return this.items;
		let result = {
			items: {},
			createdAt: this.createdAt.toISO()
		};
		const storedData = await this.load();
		if (storedData) {
			const cacheTTLDuration = { hours: AbstractGithubGraphqlCacheStrategy.cacheTTLDays * 24 };
			if (!isDateExpired(this.now, storedData.createdAt, cacheTTLDuration)) result = storedData;
		}
		this.createdAt = DateTime.fromISO(result.createdAt).toUTC();
		this.items = result.items;
		return this.items;
	}
	/**
	* If package release exists longer than this cache can exist,
	* we assume it won't updated/removed on the Github side.
	*/
	isStabilized(item) {
		const unstableDuration = { hours: AbstractGithubGraphqlCacheStrategy.cacheTTLDays * 24 };
		return isDateExpired(this.now, item.releaseTimestamp, unstableDuration);
	}
	/**
	* Process items received from GraphQL page
	* ordered by `releaseTimestamp` in descending order
	* (fresh versions go first).
	*/
	async reconcile(items) {
		const cachedItems = await this.getItems();
		let isPaginationDone = false;
		for (const item of items) {
			const { version } = item;
			const oldItem = cachedItems[version];
			if (!this.skipStabilization && oldItem && this.isStabilized(oldItem)) isPaginationDone = true;
			if (!oldItem || !dequal(oldItem, item)) this.hasNovelty = true;
			cachedItems[version] = item;
			this.reconciledVersions ??= /* @__PURE__ */ new Set();
			this.reconciledVersions.add(version);
		}
		this.items = cachedItems;
		return isPaginationDone;
	}
	/**
	* Handle removed items for packages that are not stabilized
	* and return the list of all items.
	*/
	async finalizeAndReturn() {
		const cachedItems = await this.getItems();
		let resultItems;
		let hasDeletedItems = false;
		if (this.reconciledVersions) {
			resultItems = {};
			for (const [version, item] of Object.entries(cachedItems)) if (this.reconciledVersions.has(version) || this.isStabilized(item)) resultItems[version] = item;
			else hasDeletedItems = true;
		} else resultItems = cachedItems;
		if (this.hasNovelty || hasDeletedItems) await this.store(resultItems);
		return Object.values(resultItems);
	}
	async store(cachedItems) {
		const cacheRecord = {
			items: cachedItems,
			createdAt: this.createdAt.toISO()
		};
		await this.persist(cacheRecord);
	}
};
//#endregion
export { AbstractGithubGraphqlCacheStrategy };

//# sourceMappingURL=abstract-cache-strategy.js.map