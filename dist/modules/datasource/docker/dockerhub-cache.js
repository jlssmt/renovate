import { get, set } from "../../../util/cache/package/index.js";
import { dequal } from "dequal";
import { DateTime } from "luxon";
//#region lib/modules/datasource/docker/dockerhub-cache.ts
const cacheNamespace = "datasource-docker-hub-cache";
var DockerHubCache = class DockerHubCache {
	isChanged = false;
	reconciledIds = /* @__PURE__ */ new Set();
	dockerRepository;
	cache;
	constructor(dockerRepository, cache) {
		this.dockerRepository = dockerRepository;
		this.cache = cache;
	}
	static async init(dockerRepository) {
		let repoCache = await get(cacheNamespace, dockerRepository);
		repoCache ??= {
			items: {},
			updatedAt: null
		};
		return new DockerHubCache(dockerRepository, repoCache);
	}
	reconcile(items, expectedCount) {
		let needNextPage = true;
		let earliestDate = null;
		let { updatedAt } = this.cache;
		let latestDate = updatedAt ? DateTime.fromISO(updatedAt) : null;
		for (const newItem of items) {
			const id = newItem.id;
			this.reconciledIds.add(id);
			const oldItem = this.cache.items[id];
			const itemDate = DateTime.fromISO(newItem.last_updated);
			if (!earliestDate || earliestDate > itemDate) earliestDate = itemDate;
			if (!latestDate || latestDate < itemDate) {
				latestDate = itemDate;
				updatedAt = newItem.last_updated;
			}
			if (dequal(oldItem, newItem)) {
				needNextPage = false;
				continue;
			}
			this.cache.items[newItem.id] = newItem;
			this.isChanged = true;
		}
		this.cache.updatedAt = updatedAt;
		// v8 ignore else -- needs a cache populated across two sync runs
		if (earliestDate && latestDate) {
			for (const [key, item] of Object.entries(this.cache.items)) {
				const id = parseInt(key, 10);
				const itemDate = DateTime.fromISO(item.last_updated);
				if (itemDate < earliestDate || itemDate > latestDate || this.reconciledIds.has(id)) continue;
				delete this.cache.items[id];
				this.isChanged = true;
			}
			if (Object.keys(this.cache.items).length > expectedCount) return true;
		}
		return needNextPage;
	}
	async save() {
		if (this.isChanged) await set(cacheNamespace, this.dockerRepository, this.cache, 129600);
	}
	getItems() {
		return Object.values(this.cache.items);
	}
	getDigestForTag(tagName) {
		return this.getItems().find((item) => item.name === tagName)?.digest ?? null;
	}
	getArchDigestForTag(tagName, architecture) {
		return this.getItems().find((item) => item.name === tagName)?.images.find((img) => img.architecture === architecture)?.digest ?? null;
	}
};
//#endregion
export { DockerHubCache };

//# sourceMappingURL=dockerhub-cache.js.map