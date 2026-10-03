import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { cachePathExists, createCacheWriteStream, ensureCacheDir, pipeline, rmCache } from "../../../util/fs/index.js";
import "../../versioning/apk/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { parseApkIndexFile } from "./parser.js";
import { constructComponentUrls } from "./url.js";
import { isNonEmptyObject } from "@sindresorhus/is";
import { randomUUID } from "node:crypto";
import upath from "upath";
import { extract } from "tar";
const defaultConfig = {
	commitMessageTopic: "{{{depName}}} APK package",
	commitMessageExtra: "to {{#if isMajor}}{{{prettyNewMajor}}}{{else}}{{{prettyNewVersion}}}{{/if}}"
};
/**
* Groups packages by name so that a lookup does not scan the whole index.
*
* An index holds thousands of packages, and a name can appear more than once
* when the component serves multiple versions of it.
*/
function groupPackagesByName(packages) {
	const packagesByName = {};
	for (const pkg of packages) {
		packagesByName[pkg.name] ??= [];
		packagesByName[pkg.name].push(pkg);
	}
	return packagesByName;
}
var ApkDatasource = class ApkDatasource extends Datasource {
	static id = "apk";
	defaultVersioning = "apk";
	/**
	* Alpine APK repositories are laid out as
	* `{base}/{branch}/{component}/{arch}/APKINDEX.tar.gz`, and `/etc/apk/repositories`
	* holds one entry per component.
	*
	* For Renovate, the path segments are encoded as query parameters so that a single
	* registry URL can cover multiple components.
	*
	* The following query parameter is required:
	* - arch: e.g. x86_64, aarch64, armv7
	*
	* The following query parameters are optional, as repositories such as Wolfi serve
	* their index directly below the repository root:
	* - branch: latest-stable, v3.19, edge or any other Alpine branch
	* - components: comma separated list of components, e.g. main,community,testing
	*/
	getDefaultRegistryUrls(_packageName) {
		return ["https://dl-cdn.alpinelinux.org/alpine?branch=latest-stable&components=main&arch=x86_64"];
	}
	defaultConfig = defaultConfig;
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `buildDate` field in the results.";
	constructor() {
		super(ApkDatasource.id);
	}
	/**
	* Gets all available packages from a single APK component, keyed by package name
	*/
	async _getPackages(componentUrl) {
		logger.debug(`Fetching APK packages from ${componentUrl}`);
		const extractId = randomUUID();
		const cacheDir = await ensureCacheDir(upath.join("apk", extractId));
		const tarFile = upath.join(cacheDir, "APKINDEX.tar.gz");
		const extractedFile = upath.join(cacheDir, "APKINDEX");
		try {
			const indexUrl = joinUrlParts(componentUrl, "APKINDEX.tar.gz");
			logger.debug(`Attempting to download ${indexUrl}`);
			const readStream = this.http.stream(indexUrl);
			const writeStream = createCacheWriteStream(tarFile);
			await pipeline(readStream, writeStream);
			await extract({
				file: tarFile,
				cwd: cacheDir,
				filter: (path) => upath.basename(path) === "APKINDEX"
			});
			if (!await cachePathExists(extractedFile)) {
				logger.warn({ componentUrl }, "APKINDEX file not found in tar archive");
				return {};
			}
			logger.debug("Successfully extracted APKINDEX content");
			let packages = [];
			try {
				packages = await parseApkIndexFile(extractedFile);
			} catch (err) {
				logger.warn({
					componentUrl,
					err
				}, "Error parsing APK index file");
				return {};
			}
			logger.debug({
				componentUrl,
				packageCount: packages.length
			}, "Successfully parsed APK index");
			return groupPackagesByName(packages);
		} catch (err) {
			if (err instanceof RequestError) {
				const statusCode = err.response?.statusCode;
				if (statusCode === 429 || statusCode && statusCode >= 500) throw new ExternalHostError(err);
				throw err;
			}
			logger.warn({
				componentUrl,
				err
			}, "Error extracting APK index from tar.gz");
			return {};
		} finally {
			await rmCache(cacheDir);
		}
	}
	getPackages(componentUrl) {
		return withCache({
			namespace: `datasource-${ApkDatasource.id}`,
			key: componentUrl,
			ttlMinutes: 60,
			fallback: true,
			shouldCacheResult: isNonEmptyObject
		}, () => this._getPackages(componentUrl));
	}
	/**
	* Gets releases for a specific package from APK repositories
	*/
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore if -- should never happen */
		if (!registryUrl) return null;
		logger.debug(`Getting APK releases for ${packageName} from ${registryUrl}`);
		const componentUrls = constructComponentUrls(registryUrl);
		let result = null;
		const seenVersions = /* @__PURE__ */ new Set();
		for (const componentUrl of componentUrls) try {
			const matchingPackages = (await this.getPackages(componentUrl))[packageName];
			if (!matchingPackages) {
				logger.debug({
					packageName,
					componentUrl
				}, "No matching packages found");
				continue;
			}
			const releases = [];
			for (const pkg of matchingPackages) {
				if (seenVersions.has(pkg.version)) continue;
				seenVersions.add(pkg.version);
				releases.push({
					version: pkg.version,
					releaseTimestamp: pkg.buildDate ? asTimestamp(pkg.buildDate * 1e3) : void 0
				});
			}
			logger.trace({
				packageName,
				componentUrl,
				releaseCount: releases.length,
				releases
			}, "Found APK releases");
			result ??= {
				releases: [],
				registryUrl
			};
			result.homepage ??= matchingPackages.find((pkg) => pkg.url)?.url;
			result.releases.push(...releases);
		} catch (err) {
			if (err instanceof ExternalHostError) throw err;
			logger.debug({
				packageName,
				componentUrl,
				err
			}, "Skipping APK component due to an error");
		}
		return result;
	}
};
//#endregion
export { ApkDatasource };

//# sourceMappingURL=index.js.map