import { coerceArray, deduplicateArray, isNotNullOrUndefined } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { hashStream } from "../../../../util/hash.js";
import { createCacheWriteStream, ensureCacheDir, pipeline, rmCache } from "../../../../util/fs/index.js";
import { withCache } from "../../../../util/cache/package/with-cache.js";
import { Http } from "../../../../util/http/index.js";
import { map } from "../../../../util/promises.js";
import { TerraformProviderDatasource } from "../../../datasource/terraform-provider/index.js";
import crypto from "node:crypto";
import { Transform } from "node:stream";
import upath from "upath";
import { crc32 } from "node:zlib";
import { once } from "node:events";
import { openPromise, validateFileName } from "yauzl";
//#region lib/modules/manager/terraform/lockfile/hash.ts
var Crc32Stream = class extends Transform {
	checksum = 0;
	_transform(chunk, _encoding, callback) {
		this.checksum = crc32(chunk, this.checksum);
		callback(null, chunk);
	}
};
var TerraformProviderHash = class TerraformProviderHash {
	static http = new Http(TerraformProviderDatasource.id);
	static terraformDatasource = new TerraformProviderDatasource();
	static hashCacheTTL = 10080;
	/**
	* Computes the `h1:` checksum used in Terraform dependency lock files.
	*
	* Terraform verifies extracted providers with Go's `HashDir`, which ignores
	* ZIP directory entries. Ignore them here so the archive produces the same
	* checksum as the extracted provider.
	*
	* See https://github.com/golang/go/issues/53448.
	*/
	static async hashOfZipContent(zipFilePath) {
		const zipFile = await openPromise(zipFilePath, {
			autoClose: false,
			decodeStrings: false
		});
		const entryHashes = [];
		const entryPaths = /* @__PURE__ */ new Set();
		try {
			for await (const entry of zipFile.eachEntry()) {
				const fileName = entry.fileNameRaw.toString("latin1").replaceAll("\\", "/");
				if (fileName.endsWith("/")) continue;
				if (fileName.includes("\n")) throw new Error("ZIP entry name contains a newline");
				const fileNameError = validateFileName(fileName);
				if (fileNameError) throw new Error(fileNameError);
				const normalizedPath = upath.normalize(fileName);
				if (entryPaths.has(normalizedPath)) throw new Error(`Duplicate ZIP entry path: ${normalizedPath}`);
				entryPaths.add(normalizedPath);
				const path = Buffer.from(normalizedPath, "latin1");
				const entryStream = await zipFile.openReadStreamPromise(entry);
				const crc32Stream = new Crc32Stream();
				const hash = await hashStream(entryStream.compose(crc32Stream), "sha256");
				if (crc32Stream.checksum !== entry.crc32) throw new Error(`CRC-32 mismatch for ZIP entry ${entry.fileNameRaw.toString("utf8")}`);
				entryHashes.push({
					path,
					hash
				});
			}
		} finally {
			const closePromise = once(zipFile, "close");
			zipFile.close();
			await closePromise;
		}
		entryHashes.sort((left, right) => Buffer.compare(left.path, right.path));
		const rootHash = crypto.createHash("sha256");
		for (const entry of entryHashes) {
			rootHash.update(`${entry.hash}  `);
			rootHash.update(entry.path);
			rootHash.update("\n");
		}
		return rootHash.digest("base64");
	}
	static async _calculateSingleHash(build, cacheDir) {
		const downloadFileName = upath.join(cacheDir, crypto.randomUUID());
		logger.trace(`Downloading archive and generating hash for ${build.name}-${build.version}...`);
		const startTime = Date.now();
		const readStream = TerraformProviderHash.http.stream(build.url);
		const writeStream = createCacheWriteStream(downloadFileName);
		try {
			await pipeline(readStream, writeStream);
			const hash = await this.hashOfZipContent(downloadFileName);
			logger.debug(`Hash generation for ${build.url} took ${Date.now() - startTime}ms for ${build.name}-${build.version}`);
			return hash;
		} finally {
			await rmCache(downloadFileName);
		}
	}
	static calculateSingleHash(build, cacheDir) {
		return withCache({
			namespace: `terraform-provider-hash`,
			key: `calculateSingleHash:${build.url}`,
			ttlMinutes: TerraformProviderHash.hashCacheTTL
		}, () => TerraformProviderHash._calculateSingleHash(build, cacheDir));
	}
	static async calculateHashScheme1Hashes(builds) {
		logger.debug(`Calculating hashes for ${builds.length} builds`);
		const cacheDir = await ensureCacheDir("terraform");
		return map(builds, (build) => this.calculateSingleHash(build, cacheDir), { concurrency: 4 });
	}
	static async createHashes(registryURL, repository, version) {
		logger.debug(`Creating hashes for ${repository}@${version} (${registryURL})`);
		if (registryURL === TerraformProviderDatasource.openTofuRegistryUrl || registryURL === TerraformProviderDatasource.openTofuApiUrl) {
			const packagesHashes = await TerraformProviderHash.terraformDatasource.getProviderPackages(repository, version);
			if (packagesHashes?.length) {
				logger.debug(`Using OpenTofu packages API for ${repository}@${version}`);
				return deduplicateArray(packagesHashes).sort();
			}
			logger.debug(`OpenTofu packages field unavailable for ${repository}@${version}, falling back to zip download`);
		}
		const builds = await TerraformProviderHash.terraformDatasource.getBuilds(registryURL, repository, version);
		if (!builds) return null;
		const shaUrls = deduplicateArray(builds.map((build) => build.shasums_url).filter(isNotNullOrUndefined));
		logger.debug(`Getting zip hashes for ${shaUrls.length} shasum URL(s) for ${repository}@${version}`);
		const zhHashes = [];
		for (const shaUrl of shaUrls) {
			const hashes = await TerraformProviderHash.terraformDatasource.getZipHashes(shaUrl);
			zhHashes.push(...coerceArray(hashes));
		}
		logger.debug(`Got ${zhHashes.length} zip hashes for ${repository}@${version}`);
		const h1Hashes = await TerraformProviderHash.calculateHashScheme1Hashes(builds);
		const hashes = [];
		hashes.push(...h1Hashes.map((hash) => `h1:${hash}`));
		hashes.push(...zhHashes.map((hash) => `zh:${hash}`));
		return deduplicateArray(hashes).sort();
	}
};
//#endregion
export { TerraformProviderHash };

//# sourceMappingURL=hash.js.map