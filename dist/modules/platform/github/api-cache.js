import { logger } from "../../../logger/index.js";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/modules/platform/github/api-cache.ts
var ApiCache = class {
	cache;
	constructor(cache) {
		this.cache = cache;
	}
	getItems() {
		return Object.values(this.cache.items);
	}
	getItem(number) {
		return this.cache.items[number] ?? null;
	}
	/**
	* It intentionally doesn't alter `lastModified` cache field.
	*
	* The point is to allow cache modifications during run, but
	* force fetching and refreshing of modified items next run.
	*/
	updateItem(item) {
		this.cache.items[item.number] = item;
	}
	getLastModified() {
		return this.cache.lastModified;
	}
	updateLastModified(timestamp) {
		const current = this.cache.lastModified ? DateTime.fromISO(this.cache.lastModified) : null;
		const incoming = DateTime.fromISO(timestamp);
		if (!current || incoming > current) this.cache.lastModified = timestamp;
	}
	/**
	* Copies items from `page` to cache and updates the internal timestamp.
	*
	* @param page Items sorted by `updated_at` desc (most recent first).
	* @returns `true` when the next page is likely to contain fresh items.
	*/
	reconcile(page) {
		if (page.length === 0) return false;
		const { items } = this.cache;
		let { lastModified } = this.cache;
		let needNextPage = true;
		for (const newItem of page) {
			const number = newItem.number;
			const oldItem = items[number];
			const itemNewTime = DateTime.fromISO(newItem.updated_at);
			const itemOldTime = oldItem?.updated_at ? DateTime.fromISO(oldItem.updated_at) : null;
			if (!dequal(oldItem, newItem)) {
				logger.trace(`PR cache: updating item ${number}`);
				items[number] = newItem;
			}
			needNextPage = itemOldTime ? itemOldTime < itemNewTime : true;
			const cacheOldTime = lastModified ? DateTime.fromISO(lastModified) : null;
			if (!cacheOldTime || itemNewTime > cacheOldTime) lastModified = newItem.updated_at;
		}
		this.cache.lastModified = lastModified;
		return needNextPage;
	}
};
//#endregion
export { ApiCache };

//# sourceMappingURL=api-cache.js.map