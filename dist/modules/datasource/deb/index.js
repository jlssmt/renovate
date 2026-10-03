import { logger } from "../../../logger/index.js";
import { createCacheReadStream } from "../../../util/fs/index.js";
import { Datasource } from "../datasource.js";
import { packageKeys, requiredPackageKeys } from "./common.js";
import { constructComponentUrls } from "./url.js";
import { downloadAndExtractPackage } from "./packages.js";
import { formatReleaseResult, releaseMetaInformationMatches } from "./release.js";
import readline from "node:readline";
//#region lib/modules/datasource/deb/index.ts
var DebDatasource = class DebDatasource extends Datasource {
	static id = "deb";
	constructor() {
		super(DebDatasource.id);
	}
	/**
	* Users are able to specify custom Debian repositories as long as they follow
	* the Debian package repository format as specified here
	* @see{https://wiki.debian.org/DebianRepository/Format}
	*/
	supportsCustomRegistry(_packageName) {
		return true;
	}
	/**
	* Users can specify multiple upstream repositories and the datasource will aggregate the release
	* @example
	* When specifying multiple dependencies both internal and external dependencies from internal/external artifactory
	*/
	registryStrategy = "merge";
	/**
	* The original apt source list file format is
	* deb uri distribution [component1] [component2] [...]
	* @see{https://wiki.debian.org/DebianRepository/Format}
	*
	* However, for Renovate, we require the registry URLs to be
	* valid URLs which is why the parameters are encoded in the URL.
	*
	* The following query parameters are required:
	* - components: comma separated list of components
	* - suite: stable, oldstable or other alias for a release, either this or release must be given like buster
	* - binaryArch: e.g. amd64 resolves to http://deb.debian.org/debian/dists/stable/non-free/binary-amd64/
	*/
	getDefaultRegistryUrls(_packageName) {
		return ["https://deb.debian.org/debian?suite=stable&components=main,contrib,non-free&binaryArch=amd64"];
	}
	defaultVersioning = "deb";
	/**
	* Parses the extracted package index file.
	*
	* @param extractedFile - The path to the extracted package file.
	* @param lastTimestamp - The timestamp of the last modification.
	* @returns a list of packages with minimal Metadata.
	*/
	async readExtractedPackageIndex(extractedFile, _lastTimestamp) {
		const rl = readline.createInterface({
			input: createCacheReadStream(extractedFile),
			terminal: false
		});
		let currentPackage = {};
		const allPackages = {};
		for await (const line of rl) if (line === "") {
			// v8 ignore else -- needs a package index block missing a required key
			if (requiredPackageKeys.every((key) => key in currentPackage)) {
				if (!allPackages[currentPackage.Package]) allPackages[currentPackage.Package] = [];
				allPackages[currentPackage.Package].push(currentPackage);
				currentPackage = {};
			}
		} else for (const key of packageKeys) if (line.startsWith(`${key}:`)) {
			currentPackage[key] = line.substring(key.length + 1).trim();
			break;
		}
		if (requiredPackageKeys.every((key) => key in currentPackage)) {
			// v8 ignore else -- needs the final block to repeat an earlier package
			if (!allPackages[currentPackage.Package]) allPackages[currentPackage.Package] = [];
			allPackages[currentPackage.Package].push(currentPackage);
		}
		return allPackages;
	}
	parseExtractedPackageIndex(extractedFile, lastTimestamp) {
		return this.cached({
			key: `${extractedFile}:${lastTimestamp.getTime()}`,
			ttlMinutes: 1440
		}, () => this.readExtractedPackageIndex(extractedFile, lastTimestamp));
	}
	async fetchPackageIndex(componentUrl) {
		const { extractedFile, lastTimestamp } = await downloadAndExtractPackage(componentUrl, this.http);
		return await this.parseExtractedPackageIndex(extractedFile, lastTimestamp);
	}
	getPackageIndex(componentUrl) {
		return this.cached({ key: componentUrl }, () => this.fetchPackageIndex(componentUrl));
	}
	/**
	* Fetches the release information for a given package from the registry URL.
	*
	* @param config - Configuration for fetching releases.
	* @returns The release result if the package is found, otherwise null.
	*/
	async fetchReleases({ registryUrl, packageName }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const componentUrls = constructComponentUrls(registryUrl);
		let aggregatedRelease = null;
		for (const componentUrl of componentUrls) try {
			const parsedPackages = (await this.getPackageIndex(componentUrl))[packageName];
			if (parsedPackages) {
				const newRelease = formatReleaseResult(parsedPackages);
				if (aggregatedRelease === null) aggregatedRelease = newRelease;
				else {
					// v8 ignore else -- needs two component indexes with matching meta
					if (!releaseMetaInformationMatches(aggregatedRelease, newRelease)) logger.warn({ packageName }, "Package occurred in more than one repository with different meta information. Aggregating releases anyway.");
					aggregatedRelease.releases.push(...newRelease.releases);
				}
			}
		} catch (error) {
			logger.debug({
				componentUrl,
				err: error
			}, "Skipping component due to an error");
		}
		return aggregatedRelease;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { DebDatasource };

//# sourceMappingURL=index.js.map