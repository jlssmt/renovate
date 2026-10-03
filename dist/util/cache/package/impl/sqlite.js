import { getEnv } from "../../../env.js";
import { logger } from "../../../../logger/index.js";
import { ensureDir } from "../../../fs/index.js";
import { PackageCacheBase } from "./base.js";
import { parseInteger } from "../../../number.js";
import fs from "fs-extra";
import upath from "upath";
//#region lib/util/cache/package/impl/sqlite.ts
const { exists } = fs;
var PackageCacheSqlite = class PackageCacheSqlite extends PackageCacheBase {
	static async create(cacheDir) {
		const { DatabaseSync: Sqlite } = await import("node:sqlite");
		const sqliteDir = upath.join(cacheDir, "renovate/renovate-cache-sqlite");
		await ensureDir(sqliteDir);
		const sqliteFile = upath.join(sqliteDir, "db.sqlite");
		if (await exists(sqliteFile)) logger.debug(`Using SQLite package cache: ${sqliteFile}`);
		else logger.debug(`Creating SQLite package cache: ${sqliteFile}`);
		const { RENOVATE_X_SQLITE_BUSY_TIMEOUT } = getEnv();
		const client = new Sqlite(sqliteFile, { timeout: parseInteger(RENOVATE_X_SQLITE_BUSY_TIMEOUT, 5e3) });
		return new PackageCacheSqlite(client);
	}
	upsertStatement;
	getStatement;
	deleteStatement;
	deleteExpiredRows;
	countStatement;
	client;
	constructor(client) {
		super();
		this.client = client;
		client.exec("PRAGMA journal_mode = WAL");
		client.exec("PRAGMA encoding = 'UTF-8'");
		client.exec(`
          CREATE TABLE IF NOT EXISTS package_cache (
            namespace TEXT NOT NULL,
            key TEXT NOT NULL,
            expiry INTEGER NOT NULL,
            data BLOB NOT NULL,
            PRIMARY KEY (namespace, key)
          )
        `);
		client.exec("CREATE INDEX IF NOT EXISTS expiry ON package_cache (expiry)");
		this.upsertStatement = client.prepare(`
      INSERT INTO package_cache (namespace, key, data, expiry)
      VALUES (@namespace, @key, @data, unixepoch() + @ttlSeconds)
      ON CONFLICT (namespace, key) DO UPDATE SET
        data = @data,
        expiry = unixepoch() + @ttlSeconds
    `);
		this.getStatement = client.prepare(`
          SELECT data FROM package_cache
          WHERE
            namespace = @namespace AND key = @key AND expiry > unixepoch()
        `);
		this.deleteStatement = client.prepare(`
      DELETE FROM package_cache
      WHERE namespace = @namespace AND key = @key
    `);
		this.deleteExpiredRows = client.prepare(`
      DELETE FROM package_cache
      WHERE expiry <= unixepoch()
    `);
		this.countStatement = client.prepare("SELECT COUNT(*) as total FROM package_cache");
	}
	writeRaw(namespace, key, data, ttlSeconds) {
		this.upsertStatement.run({
			namespace,
			key,
			data,
			ttlSeconds
		});
	}
	readRaw(namespace, key) {
		const row = this.getStatement.get({
			namespace,
			key
		});
		if (!row) return;
		return Buffer.from(row.data.buffer, row.data.byteOffset, row.data.byteLength);
	}
	rm(namespace, key) {
		logger.trace({
			namespace,
			key
		}, "Removing cache entry");
		this.deleteStatement.run({
			namespace,
			key
		});
	}
	destroy() {
		try {
			const startTime = Date.now();
			const totalCount = this.countStatement.get().total;
			const { changes: deletedCount } = this.deleteExpiredRows.run();
			const durationMs = Date.now() - startTime;
			logger.debug(`SQLite package cache: deleted ${deletedCount} of ${totalCount} entries in ${durationMs}ms`);
		} catch (err) {
			logger.warn({ err }, "SQLite package cache cleanup failed");
		}
		try {
			this.client.close();
		} catch (err) {
			logger.warn({ err }, "SQLite package cache close failed");
		}
		return Promise.resolve();
	}
};
//#endregion
export { PackageCacheSqlite };

//# sourceMappingURL=sqlite.js.map