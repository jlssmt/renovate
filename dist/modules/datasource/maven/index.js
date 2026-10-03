import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { compare } from "../../versioning/maven/compare.js";
import { api, id } from "../../versioning/maven/index.js";
import { get, set } from "../../../util/cache/package/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { MAVEN_CENTRAL_URLS, MAVEN_REPO } from "./common.js";
import { createUrlForDependencyPom, downloadMaven, downloadMavenXml, getDependencyInfo, getDependencyParts, getMavenUrl } from "./util.js";
//#region lib/modules/datasource/maven/index.ts
function getLatestSuitableVersion(releases) {
	/* v8 ignore next -- TODO: add test */
	if (!releases?.length) return null;
	const allVersions = releases.map(({ version }) => version);
	const stableVersions = allVersions.filter((x) => api.isStable(x));
	return (stableVersions.length ? stableVersions : allVersions).reduce((latestVersion, version) => compare(version, latestVersion) === 1 ? version : /* istanbul ignore next: hard to test */ latestVersion);
}
function extractVersions(metadata) {
	const res = {};
	const elements = metadata.descendantWithPath("versioning.versions")?.childrenNamed("version");
	if (!elements) return res;
	res.versions = elements.map((el) => el.val);
	const latest = metadata.descendantWithPath("versioning.latest");
	if (latest?.val) {
		res.tags ??= {};
		res.tags.latest = latest.val;
	}
	const release = metadata.descendantWithPath("versioning.release");
	if (release?.val) {
		res.tags ??= {};
		res.tags.release = release.val;
	}
	return res;
}
const defaultRegistryUrls = [MAVEN_REPO];
var MavenDatasource = class MavenDatasource extends Datasource {
	static id = "maven";
	caching = true;
	getDefaultRegistryUrls(_packageName) {
		return defaultRegistryUrls;
	}
	defaultVersioning = id;
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `Last-Modified` header or the `lastModified` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `scm` tags in the results.";
	constructor(id = MavenDatasource.id) {
		super(id);
	}
	async fetchVersionsFromMetadata(dependency, repoUrl) {
		const metadataUrl = getMavenUrl(dependency, repoUrl, "maven-metadata.xml");
		return (await downloadMavenXml(this.http, metadataUrl)).transform(({ data: metadata }) => extractVersions(metadata)).onError((err) => {
			logger.debug(`Maven: error fetching versions for "${dependency.display}": ${err.type}`);
		}).unwrapOr({});
	}
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const dependency = getDependencyParts(packageName);
		const repoUrl = ensureTrailingSlash(registryUrl);
		if ((packageName.includes(".gradle.plugin:") || packageName.endsWith(".gradle.plugin")) && MAVEN_CENTRAL_URLS.some((url) => repoUrl === ensureTrailingSlash(url))) {
			logger.debug(`Maven: skipping Maven Central for suspected Gradle plugin "${packageName}"`);
			return null;
		}
		logger.debug(`Looking up ${dependency.display} in repository ${repoUrl}`);
		const metadata = await this.fetchVersionsFromMetadata(dependency, repoUrl);
		if (!metadata.versions?.length) return null;
		const releases = metadata.versions.map((version) => ({ version }));
		logger.debug(`Found ${releases.length} new releases for ${dependency.display} in repository ${repoUrl}`);
		const latestSuitableVersion = getLatestSuitableVersion(releases);
		const dependencyInfo = latestSuitableVersion && await getDependencyInfo(this.http, dependency, repoUrl, latestSuitableVersion);
		const result = {
			...dependency,
			...dependencyInfo,
			releases
		};
		if (metadata.tags) {
			result.tags = metadata.tags;
			if (result.tags.latest) {
				logger.debug(`Setting respectLatest=false for maven ${packageName}`);
				result.respectLatest = false;
			}
		}
		if (!this.getDefaultRegistryUrls("").includes(registryUrl)) result.isPrivate = true;
		return result;
	}
	async postprocessRelease({ packageName, registryUrl }, release) {
		const { version, versionOrig } = release;
		const cacheKey = versionOrig ? `postprocessRelease:${registryUrl}:${packageName}:${versionOrig}:${version}` : `postprocessRelease:${registryUrl}:${packageName}:${version}`;
		const cachedResult = await get("datasource-maven:postprocess-reject", cacheKey);
		/* v8 ignore if: hard to test */
		if (cachedResult) return cachedResult;
		if (!packageName || !registryUrl) return release;
		const dependency = getDependencyParts(packageName);
		const pomUrl = await createUrlForDependencyPom(this.http, release.versionOrig ?? release.version, dependency, registryUrl);
		const artifactUrl = getMavenUrl(dependency, registryUrl, pomUrl);
		const { val, err } = (await downloadMaven(this.http, artifactUrl)).unwrap();
		if (err) {
			const result = err.type === "not-found" ? "reject" : release;
			if (result === "reject") await set("datasource-maven:postprocess-reject", cacheKey, result, 1440);
			return result;
		}
		if (val.lastModified) release.releaseTimestamp = asTimestamp(val.lastModified);
		return release;
	}
};
//#endregion
export { MavenDatasource, defaultRegistryUrls };

//# sourceMappingURL=index.js.map