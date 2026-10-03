import { regEx } from "../../../regex.js";
import { logger } from "../../../../logger/index.js";
import { parseUrl } from "../../../url.js";
import { PackageCacheBase } from "./base.js";
import { RESP_TYPES, createClient, createCluster } from "@redis/client";
//#region lib/util/cache/package/impl/redis.ts
function normalizeRedisUrl(url) {
	return url.replace(regEx(/^(?<scheme>rediss?)\+cluster:\/\//), "$<scheme>://");
}
const RESP = 2;
var PackageCacheRedis = class PackageCacheRedis extends PackageCacheBase {
	static async create(url, prefix) {
		const rprefix = prefix ?? "";
		logger.debug("Redis cache init");
		const rewrittenUrl = normalizeRedisUrl(url);
		const clusteredMode = rewrittenUrl !== url;
		const config = {
			url: rewrittenUrl,
			socket: { reconnectStrategy: (retries) => Math.min(retries * 100, 3e3) },
			pingInterval: 3e4
		};
		let client;
		if (clusteredMode) {
			const clusterConfig = {
				rootNodes: [config],
				RESP
			};
			const parsedUrl = parseUrl(rewrittenUrl);
			if (parsedUrl?.username) clusterConfig.defaults = { username: parsedUrl.username };
			if (parsedUrl?.password) {
				clusterConfig.defaults ??= {};
				clusterConfig.defaults.password = parsedUrl.password;
			}
			client = createCluster(clusterConfig);
		} else client = createClient({
			...config,
			RESP
		});
		await client.connect();
		logger.debug("Redis cache connected");
		const binaryClient = client.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer });
		return new PackageCacheRedis(client, binaryClient, rprefix);
	}
	client;
	binaryClient;
	rprefix;
	constructor(client, binaryClient, rprefix) {
		super();
		this.client = client;
		this.binaryClient = binaryClient;
		this.rprefix = rprefix;
	}
	getKey(namespace, key) {
		return `${this.rprefix}${namespace}-${key}`;
	}
	destroy() {
		try {
			this.client.destroy();
		} catch (err) {
			logger.warn({ err }, "Redis cache destroy failed");
		}
		return Promise.resolve();
	}
	async readRaw(namespace, key) {
		return await this.binaryClient.get(this.getKey(namespace, key)) ?? void 0;
	}
	async writeRaw(namespace, key, data, ttlSeconds) {
		await this.client.set(this.getKey(namespace, key), data, { EX: ttlSeconds });
	}
	async rm(namespace, key) {
		logger.trace({
			rprefix: this.rprefix,
			namespace,
			key
		}, "Removing cache entry");
		await this.client.del(this.getKey(namespace, key));
	}
};
//#endregion
export { PackageCacheRedis, normalizeRedisUrl };

//# sourceMappingURL=redis.js.map