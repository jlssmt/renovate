import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { outputCacheFile } from "../../../fs/index.js";
import { getS3Client, parseS3Url } from "../../../s3.js";
import { streamToString } from "../../../streams.js";
import { getLocalCacheFileName } from "../common.js";
import { RepoCacheBase } from "./base.js";
import { Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
//#region lib/util/cache/repository/impl/s3.ts
var RepoCacheS3 = class extends RepoCacheBase {
	s3Client;
	bucket;
	dir;
	constructor(repository, fingerprint, url) {
		super(repository, fingerprint);
		const { Bucket, Key } = parseS3Url(url);
		this.dir = this.getCacheFolder(Key);
		this.bucket = Bucket;
		this.s3Client = getS3Client();
	}
	async read() {
		const cacheFileName = this.getCacheFileName();
		const s3Params = {
			Bucket: this.bucket,
			Key: cacheFileName
		};
		try {
			const { Body: res } = await this.s3Client.send(new GetObjectCommand(s3Params));
			if (res instanceof Readable) {
				logger.debug("RepoCacheS3.read() - success");
				return await streamToString(res);
			}
			logger.warn({ returnType: typeof res }, "RepoCacheS3.read() - failure - got unexpected return type");
		} catch (err) {
			if (err.name === "NoSuchKey") logger.debug("RepoCacheS3.read() - No cached file found");
			else logger.warn({ err }, "RepoCacheS3.read() - failure");
		}
		return null;
	}
	async write(data) {
		const cacheFileName = this.getCacheFileName();
		const stringifiedCache = JSON.stringify(data);
		const s3Params = {
			Bucket: this.bucket,
			Key: cacheFileName,
			Body: stringifiedCache,
			ContentType: "application/json"
		};
		try {
			await this.s3Client.send(new PutObjectCommand(s3Params));
			if (GlobalConfig.get("repositoryCacheForceLocal")) {
				const cacheLocalFileName = getLocalCacheFileName(this.platform, this.repository);
				await outputCacheFile(cacheLocalFileName, stringifiedCache);
			}
		} catch (err) {
			logger.warn({ err }, "RepoCacheS3.write() - failure");
		}
	}
	getCacheFolder(pathname) {
		if (!pathname) return "";
		if (pathname.endsWith("/")) return pathname;
		logger.warn({ pathname }, "RepoCacheS3.getCacheFolder() - appending missing trailing slash to pathname");
		return `${pathname}/`;
	}
	getCacheFileName() {
		return `${this.dir}${this.platform}/${this.repository}/cache.json`;
	}
};
//#endregion
export { RepoCacheS3 };

//# sourceMappingURL=s3.js.map