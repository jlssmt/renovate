import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { createCacheWriteStream, ensureCacheDir, pipeline, readCacheFile, rmCache } from "../../../util/fs/index.js";
import { api } from "../../versioning/nuget/index.js";
import { get, set } from "../../../util/cache/package/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { all } from "../../../util/promises.js";
import { memCacheProvider } from "../../../util/http/cache/memory-http-cache-provider.js";
import { massageUrl, removeBuildMeta, sortNugetVersions } from "./common.js";
import { CatalogPage, PackageRegistration, ServicesIndexRaw } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
import upath from "upath";
import semver from "semver";
import { XmlDocument } from "xmldoc";
import AdmZip from "adm-zip";
//#region lib/modules/datasource/nuget/v3.ts
var NugetV3Api = class NugetV3Api {
	static cacheNamespace = "datasource-nuget-v3";
	async getResourceUrl(http, url, resourceType = "RegistrationsBaseUrl") {
		const resultCacheKey = `${url}:${resourceType}`;
		const cachedResult = await get(NugetV3Api.cacheNamespace, resultCacheKey);
		/* v8 ignore next -- TODO: add test */
		if (cachedResult) return cachedResult;
		let servicesIndexRaw;
		try {
			const responseCacheKey = url;
			servicesIndexRaw = await get(NugetV3Api.cacheNamespace, responseCacheKey);
			// v8 ignore else -- needs a primed package cache
			if (!servicesIndexRaw) {
				servicesIndexRaw = (await http.getJson(url, { cacheProvider: memCacheProvider }, ServicesIndexRaw)).body;
				await set(NugetV3Api.cacheNamespace, responseCacheKey, servicesIndexRaw, 4320);
			}
			const services = servicesIndexRaw.resources.map(({ "@id": serviceId, "@type": t }) => ({
				serviceId,
				type: t?.split("/")?.shift(),
				version: t?.split("/")?.pop()
			})).filter(({ type, version }) => type === resourceType && semver.valid(version)).sort((x, y) => x.version && y.version ? semver.compare(x.version, y.version) : /* istanbul ignore next: hard to test */ 0);
			if (services.length === 0) {
				await set(NugetV3Api.cacheNamespace, resultCacheKey, null, 60);
				logger.debug({
					url,
					servicesIndexRaw
				}, `no ${resourceType} services found`);
				return null;
			}
			const { serviceId, version } = services.pop();
			// istanbul ignore if
			if (resourceType === "RegistrationsBaseUrl" && version && !version.startsWith("3.0.0-") && !semver.satisfies(version, "^3.0.0")) logger.warn({
				url,
				version
			}, `Nuget: Unknown version returned. Only v3 is supported`);
			await set(NugetV3Api.cacheNamespace, resultCacheKey, serviceId, 60);
			return serviceId;
		} catch (err) {
			// istanbul ignore if: not easy testable with nock
			if (err instanceof ExternalHostError) throw err;
			logger.debug({
				err,
				url,
				servicesIndexRaw
			}, `nuget registry failure: can't get ${resourceType}`);
			return null;
		}
	}
	async getCatalogEntry(http, catalogPage) {
		let items = catalogPage.items;
		if (!items) {
			const url = catalogPage["@id"];
			if (!url) return [];
			items = (await http.getJson(url, CatalogPage)).body.items;
		}
		return coerceArray(items).map(({ catalogEntry }) => catalogEntry);
	}
	async getReleases(http, registryUrl, feedUrl, pkgName) {
		const url = `${feedUrl.replace(regEx(/\/*$/), "")}/${pkgName.toLowerCase()}/index.json`;
		const catalogPages = (await http.getJson(url, PackageRegistration)).body.items;
		const catalogPagesQueue = catalogPages.map((page) => () => this.getCatalogEntry(http, page));
		const catalogEntries = (await all(catalogPagesQueue)).flat().sort((a, b) => sortNugetVersions(a.version, b.version));
		let homepage = null;
		let latestStable = null;
		let nupkgUrl = null;
		const releases = catalogEntries.map(({ version, published, projectUrl, listed, packageContent, deprecation }) => {
			const release = { version: removeBuildMeta(version) };
			const releaseTimestamp = asTimestamp(published);
			if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
			if (api.isValid(version) && api.isStable(version) && listed) {
				latestStable = removeBuildMeta(version);
				homepage = projectUrl ? massageUrl(projectUrl) : homepage;
				nupkgUrl = massageUrl(packageContent);
			}
			if (listed === false || deprecation) release.isDeprecated = true;
			return release;
		});
		if (!releases.length) return null;
		// istanbul ignore next: only happens when no stable version exists
		if (latestStable === null && catalogPages.length) {
			const last = catalogEntries.pop();
			latestStable = removeBuildMeta(last.version);
			homepage ??= last.projectUrl ?? null;
			nupkgUrl ??= massageUrl(last.packageContent);
		}
		const dep = { releases };
		if (releases.every((release) => release.isDeprecated === true)) dep.deprecationMessage = this.getDeprecationMessage(pkgName);
		try {
			const packageBaseAddress = await this.getResourceUrl(http, registryUrl, "PackageBaseAddress");
			let shouldTryNupkg = false;
			if (isNonEmptyString(packageBaseAddress)) {
				const nuspecUrl = `${ensureTrailingSlash(packageBaseAddress)}${pkgName.toLowerCase()}/${latestStable}/${pkgName.toLowerCase()}.nuspec`;
				try {
					const metaresult = await http.getText(nuspecUrl, { cacheProvider: memCacheProvider });
					const nuspec = new XmlDocument(metaresult.body);
					const releaseNotes = nuspec.valueWithPath("metadata.releaseNotes");
					if (releaseNotes) dep.changelogContent = releaseNotes;
					const sourceUrl = nuspec.valueWithPath("metadata.repository@url");
					if (sourceUrl) dep.sourceUrl = massageUrl(sourceUrl);
				} catch (err) {
					/* v8 ignore else -- not easy testable with nock */
					if (err instanceof RequestError && err.response?.statusCode === 404) {
						shouldTryNupkg = true;
						logger.debug({
							registryUrl,
							pkgName,
							pkgVersion: latestStable
						}, `package manifest (.nuspec) not found`);
					} else throw err;
				}
			} else shouldTryNupkg = true;
			if (!dep.sourceUrl && shouldTryNupkg && nupkgUrl) {
				const sourceUrl = await this.getSourceUrlFromNupkg(http, registryUrl, pkgName, latestStable, nupkgUrl);
				if (sourceUrl) {
					dep.sourceUrl = massageUrl(sourceUrl);
					logger.debug(`Determined sourceUrl ${sourceUrl} from ${nupkgUrl}`);
				}
			}
		} catch (err) {
			// istanbul ignore if: not easy testable with nock
			if (err instanceof ExternalHostError) throw err;
			if (err instanceof RequestError && err.response?.statusCode === 404) logger.debug({
				registryUrl,
				pkgName,
				pkgVersion: latestStable
			}, `package manifest (.nuspec) not found`);
			else logger.debug({
				err,
				registryUrl,
				pkgName,
				pkgVersion: latestStable
			}, `Cannot obtain sourceUrl`);
		}
		if (homepage) {
			dep.sourceUrl ??= homepage;
			dep.homepage ??= homepage;
		}
		return dep;
	}
	async _getSourceUrlFromNupkg(http, _registryUrl, packageName, packageVersion, nupkgUrl) {
		/* v8 ignore if -- specs enable RENOVATE_X_NUGET_DOWNLOAD_NUPKGS, so the disabled path is unexercised */
		if (!getEnv().RENOVATE_X_NUGET_DOWNLOAD_NUPKGS) {
			logger.once.debug("RENOVATE_X_NUGET_DOWNLOAD_NUPKGS is not set");
			return null;
		}
		const cacheDir = await ensureCacheDir("nuget");
		const nupkgFile = upath.join(cacheDir, `${packageName}.${packageVersion}.nupkg`);
		const nupkgContentsDir = upath.join(cacheDir, `${packageName}.${packageVersion}`);
		const readStream = http.stream(nupkgUrl);
		try {
			const writeStream = createCacheWriteStream(nupkgFile);
			await pipeline(readStream, writeStream);
			new AdmZip(nupkgFile).extractAllTo(nupkgContentsDir);
			const nuspecFile = upath.join(nupkgContentsDir, `${packageName}.nuspec`);
			return new XmlDocument(await readCacheFile(nuspecFile, "utf8")).valueWithPath("metadata.repository@url") ?? null;
		} finally {
			await rmCache(nupkgFile);
			await rmCache(nupkgContentsDir);
		}
	}
	getSourceUrlFromNupkg(http, registryUrl, packageName, packageVersion, nupkgUrl) {
		return withCache({
			namespace: NugetV3Api.cacheNamespace,
			key: `source-url:${registryUrl}:${packageName}`,
			ttlMinutes: 10080
		}, () => this._getSourceUrlFromNupkg(http, registryUrl, packageName, packageVersion, nupkgUrl));
	}
	getDeprecationMessage(packageName) {
		return `The package \`${packageName}\` is deprecated.`;
	}
};
//#endregion
export { NugetV3Api };

//# sourceMappingURL=v3.js.map