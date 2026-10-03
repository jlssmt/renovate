import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { hashStream } from "../../../util/hash.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { getApiBaseUrl, getSourceUrl } from "../../../util/github/url.js";
import { queryReleases } from "../../../util/github/graphql/index.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/modules/datasource/github-release-attachments/index.ts
function inferHashAlg(digest) {
	switch (digest.length) {
		case 64: return "sha256";
		default:
		case 96: return "sha512";
	}
}
var GithubReleaseAttachmentsDatasource = class GithubReleaseAttachmentsDatasource extends Datasource {
	static id = "github-release-attachments";
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com"];
	}
	http;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `releaseTimestamp` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined by using the `packageName` and `registryUrl`.";
	constructor() {
		super(GithubReleaseAttachmentsDatasource.id);
		this.http = new GithubHttp(GithubReleaseAttachmentsDatasource.id);
	}
	async _findDigestFile(release, digest) {
		const smallAssets = release.assets.filter((a) => a.size < 5120);
		for (const asset of smallAssets) {
			const res = await this.http.getText(asset.browser_download_url);
			for (const line of res.body.split(newlineRegex)) {
				const [lineDigest, lineFilename] = line.split(regEx(/\s+/), 2);
				if (lineDigest === digest) return {
					assetName: asset.name,
					digestedFileName: lineFilename,
					currentVersion: release.tag_name,
					currentDigest: lineDigest
				};
			}
		}
		return null;
	}
	findDigestFile(release, digest) {
		return withCache({
			ttlMinutes: 1440,
			namespace: `datasource-${GithubReleaseAttachmentsDatasource.id}`,
			key: `findDigestFile:${release.html_url}:${digest}`
		}, () => this._findDigestFile(release, digest));
	}
	async _downloadAndDigest(asset, algorithm) {
		const res = this.http.stream(asset.browser_download_url);
		return await hashStream(res, algorithm);
	}
	downloadAndDigest(asset, algorithm) {
		return withCache({
			ttlMinutes: 1440,
			namespace: `datasource-${GithubReleaseAttachmentsDatasource.id}`,
			key: `downloadAndDigest:${asset.browser_download_url}:${algorithm}`
		}, () => this._downloadAndDigest(asset, algorithm));
	}
	async findAssetWithDigest(release, digest) {
		const algorithm = inferHashAlg(digest);
		const assetsBySize = release.assets.sort((a, b) => {
			if (a.size < b.size) return -1;
			if (a.size > b.size) return 1;
			return 0;
		});
		for (const asset of assetsBySize) {
			const assetDigest = await this.downloadAndDigest(asset, algorithm);
			if (assetDigest === digest) return {
				assetName: asset.name,
				currentVersion: release.tag_name,
				currentDigest: assetDigest
			};
		}
		return null;
	}
	/** Identify the asset associated with a known digest. */
	async findDigestAsset(release, digest) {
		const digestFile = await this.findDigestFile(release, digest);
		if (digestFile) return digestFile;
		return await this.findAssetWithDigest(release, digest);
	}
	/** Given a digest asset, find the equivalent digest in a different release. */
	async mapDigestAssetToRelease(digestAsset, release) {
		const current = digestAsset.currentVersion.replace(regEx(/^v/), "");
		const next = release.tag_name.replace(regEx(/^v/), "");
		if (digestAsset.digestedFileName) {
			const checksumAssetName = digestAsset.assetName.replace(current, next);
			const checksumAsset = release.assets.find((a) => a.name === checksumAssetName);
			if (checksumAsset) {
				const releaseFilename = digestAsset.digestedFileName.replace(current, next);
				const res = await this.http.getText(checksumAsset.browser_download_url);
				for (const line of res.body.split(newlineRegex)) {
					const [lineDigest, lineFn] = line.split(regEx(/\s+/), 2);
					if (lineFn === releaseFilename) return lineDigest;
				}
				return null;
			}
		}
		const fileName = (digestAsset.digestedFileName ?? digestAsset.assetName).replace(current, next);
		const asset = release.assets.find((a) => a.name === fileName);
		if (!asset) return null;
		const algorithm = inferHashAlg(digestAsset.currentDigest);
		return await this.downloadAndDigest(asset, algorithm);
	}
	/**
	* Attempts to resolve the digest for the specified package.
	*
	* The `newValue` supplied here should be a valid tag for the GitHub release.
	* Requires `currentValue` and `currentDigest`.
	*
	* There may be many assets attached to the release. This function will:
	*  - Identify the asset pinned by `currentDigest` in the `currentValue` release
	*     - Download small release assets, parse as checksum manifests (e.g. `SHASUMS.txt`).
	*     - Download individual assets until `currentDigest` is encountered. This is limited to sha256 and sha512.
	*  - Map the hashed asset to `newValue` and return the updated digest as a string
	*/
	async getDigest({ packageName: repo, currentValue, currentDigest, registryUrl }, newValue) {
		logger.debug({
			repo,
			currentValue,
			currentDigest,
			registryUrl,
			newValue
		}, "getDigest");
		if (!currentDigest) return null;
		if (!currentValue) return currentDigest;
		const apiBaseUrl = getApiBaseUrl(registryUrl);
		const { body: currentRelease } = await this.http.getJsonUnchecked(`${apiBaseUrl}repos/${repo}/releases/tags/${currentValue}`);
		const digestAsset = await this.findDigestAsset(currentRelease, currentDigest);
		let newDigest;
		if (!digestAsset || newValue === currentValue) newDigest = currentDigest;
		else {
			const { body: newRelease } = await this.http.getJsonUnchecked(`${apiBaseUrl}repos/${repo}/releases/tags/${newValue}`);
			newDigest = await this.mapDigestAssetToRelease(digestAsset, newRelease);
		}
		return newDigest;
	}
	/**
	* This function can be used to fetch releases with a customizable versioning
	* (e.g. semver) and with releases.
	*
	* This function will:
	*  - Fetch all releases
	*  - Sanitize the versions if desired (e.g. strip out leading 'v')
	*  - Return a dependency object containing sourceUrl string and releases array
	*/
	async getReleases(config) {
		const releases = (await queryReleases(config, this.http)).map((item) => {
			const { version, releaseTimestamp, isStable } = item;
			const result = {
				version,
				gitRef: version,
				releaseTimestamp
			};
			if (isBoolean(isStable)) result.isStable = isStable;
			return result;
		});
		return {
			sourceUrl: getSourceUrl(config.packageName, config.registryUrl),
			releases
		};
	}
};
//#endregion
export { GithubReleaseAttachmentsDatasource };

//# sourceMappingURL=index.js.map