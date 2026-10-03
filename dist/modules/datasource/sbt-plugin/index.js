import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { compare } from "../../versioning/maven/compare.js";
import "../../versioning/ivy/index.js";
import { Http } from "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { MAVEN_REPO } from "../maven/common.js";
import { downloadHttpContent } from "../maven/util.js";
import { extractPageLinks, getLatestVersion } from "../sbt-package/util.js";
import { XmlDocument } from "xmldoc";
//#region lib/modules/datasource/sbt-plugin/index.ts
const SBT_PLUGINS_REPO = "https://repo.scala-sbt.org/scalasbt/sbt-plugin-releases";
var SbtPluginDatasource = class SbtPluginDatasource extends Datasource {
	static id = "sbt-plugin";
	getDefaultRegistryUrls(_packageName) {
		return [SBT_PLUGINS_REPO, MAVEN_REPO];
	}
	defaultVersioning = "ivy";
	registryStrategy = "merge";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `scm` tags in the results.";
	constructor() {
		super(SbtPluginDatasource.id);
		this.http = new Http("sbt");
	}
	// istanbul ignore next: to be rewritten
	async getArtifactSubdirs(searchRoot, artifact, scalaVersion) {
		const pkgUrl = ensureTrailingSlash(searchRoot);
		const indexContent = await downloadHttpContent(this.http, pkgUrl);
		if (indexContent) {
			let artifactSubdirs = extractPageLinks(indexContent, (href) => {
				const path = href.split("/").at(-1);
				if (path.startsWith(`${artifact}_native`) || path.startsWith(`${artifact}_sjs`)) return null;
				if (path === artifact || path.startsWith(`${artifact}_`)) return path;
				return null;
			});
			if (scalaVersion && artifactSubdirs.includes(`${artifact}_${scalaVersion}`)) artifactSubdirs = [`${artifact}_${scalaVersion}`];
			return artifactSubdirs;
		}
		return null;
	}
	// istanbul ignore next: to be rewritten
	async getPackageReleases(searchRoot, artifactSubdirs) {
		if (artifactSubdirs) {
			const releases = [];
			for (const searchSubdir of artifactSubdirs) {
				const pkgUrl = ensureTrailingSlash(`${searchRoot}/${searchSubdir}`);
				const content = await downloadHttpContent(this.http, pkgUrl);
				if (content) extractPageLinks(content, (href) => {
					const path = href.split("/").at(-1);
					if (path.startsWith(".")) return null;
					return path;
				}).forEach((x) => releases.push(x));
			}
			if (releases.length) return [...new Set(releases)].sort(compare);
		}
		return null;
	}
	// istanbul ignore next: to be rewritten
	async getUrls(searchRoot, artifactDirs, version) {
		const result = {};
		if (!artifactDirs?.length) return result;
		if (!version) return result;
		for (const artifactDir of artifactDirs) {
			const [artifact] = artifactDir.split("_");
			const pomFileNames = [`${artifactDir}-${version}.pom`, `${artifact}-${version}.pom`];
			for (const pomFileName of pomFileNames) {
				const pomUrl = `${searchRoot}/${artifactDir}/${version}/${pomFileName}`;
				const content = await downloadHttpContent(this.http, pomUrl);
				if (content) {
					const pomXml = new XmlDocument(content);
					const homepage = pomXml.valueWithPath("url");
					if (homepage) result.homepage = homepage;
					const sourceUrl = pomXml.valueWithPath("scm.url");
					if (sourceUrl) result.sourceUrl = sourceUrl.replace(regEx(/^scm:/), "").replace(regEx(/^git:/), "").replace(regEx(/^git@github.com:/), "https://github.com/").replace(regEx(/\.git$/), "");
					return result;
				}
			}
		}
		return result;
	}
	async resolvePluginReleases(rootUrl, artifact, scalaVersion) {
		const searchRoot = `${rootUrl}/${artifact}`;
		function hrefFilterMap(href) {
			if (href.startsWith(".")) return null;
			return href;
		}
		const searchRootContent = await downloadHttpContent(this.http, ensureTrailingSlash(searchRoot));
		if (searchRootContent) {
			const releases = [];
			const scalaVersions = extractPageLinks(searchRootContent, hrefFilterMap).map((x) => x.replace(regEx(/^scala_/), ""));
			const searchVersions = scalaVersions.includes(scalaVersion) ? [scalaVersion] : scalaVersions;
			for (const searchVersion of searchVersions) {
				const searchSubRoot = `${searchRoot}/scala_${searchVersion}`;
				const subRootContent = await downloadHttpContent(this.http, ensureTrailingSlash(searchSubRoot));
				// v8 ignore else -- needs a nested directory listing fixture
				if (subRootContent) {
					const sbtVersionItems = extractPageLinks(subRootContent, hrefFilterMap);
					for (const sbtItem of sbtVersionItems) {
						const releasesRoot = `${searchSubRoot}/${sbtItem}`;
						const releasesIndexContent = await downloadHttpContent(this.http, ensureTrailingSlash(releasesRoot));
						// v8 ignore else -- needs a nested directory listing fixture
						if (releasesIndexContent) extractPageLinks(releasesIndexContent, hrefFilterMap).forEach((x) => releases.push(x));
					}
				}
			}
			// v8 ignore else -- needs a nested directory listing fixture
			if (releases.length) return [...new Set(releases)].sort(compare);
		}
		return null;
	}
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const [groupId, artifactId] = packageName.split(":");
		const groupIdSplit = groupId.split(".");
		const [artifact, scalaVersion] = artifactId.split("_");
		const repoRoot = ensureTrailingSlash(registryUrl);
		const searchRoots = [];
		if (!registryUrl.startsWith("https://repo.maven.apache.org/maven2")) searchRoots.push(`${repoRoot}${groupIdSplit.join(".")}`);
		searchRoots.push(`${repoRoot}${groupIdSplit.join("/")}`);
		for (const searchRoot of searchRoots) {
			let versions = await this.resolvePluginReleases(searchRoot, artifact, scalaVersion);
			let urls = {};
			if (!versions?.length) {
				const artifactSubdirs = await this.getArtifactSubdirs(searchRoot, artifact, scalaVersion);
				versions = await this.getPackageReleases(searchRoot, artifactSubdirs);
				const latestVersion = getLatestVersion(versions);
				urls = await this.getUrls(searchRoot, artifactSubdirs, latestVersion);
			}
			const dependencyUrl = `${searchRoot}/${artifact}`;
			logger.trace({
				dependency: packageName,
				versions
			}, `Package versions`);
			if (versions) return {
				...urls,
				dependencyUrl,
				releases: versions.map((v) => ({ version: v }))
			};
		}
		logger.debug(`No versions found for ${packageName} in ${searchRoots.length} repositories`);
		return null;
	}
};
//#endregion
export { SBT_PLUGINS_REPO, SbtPluginDatasource };

//# sourceMappingURL=index.js.map