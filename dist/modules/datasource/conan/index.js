import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts } from "../../../util/url.js";
import { get } from "../../versioning/index.js";
import { Datasource } from "../datasource.js";
import { GithubHttp } from "../../../util/http/github.js";
import { isArtifactoryServer } from "../util.js";
import { datasource, defaultRegistryUrl, getConanPackage } from "./common.js";
import { ConanCenterReleases, ConanJSON, ConanLatestRevision, ConanProperties, ConanRevisionJSON } from "./schema.js";
import { isString, isUndefined } from "@sindresorhus/is";
//#region lib/modules/datasource/conan/index.ts
var ConanDatasource = class ConanDatasource extends Datasource {
	static id = datasource;
	getDefaultRegistryUrls(_packageName) {
		return [defaultRegistryUrl];
	}
	registryStrategy = "merge";
	githubHttp;
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is supported only if the package is served from the Artifactory servers. In which case we determine it from the `properties[conan.package.url]` field in the results.";
	constructor(id = ConanDatasource.id) {
		super(id);
		this.githubHttp = new GithubHttp(id);
	}
	async getConanCenterReleases(conanName, userAndChannel) {
		if (userAndChannel && userAndChannel !== "@_/_") {
			logger.debug({
				conanName,
				userAndChannel
			}, "User/channel not supported for Conan Center lookups");
			return null;
		}
		const url = `https://api.github.com/repos/conan-io/conan-center-index/contents/recipes/${conanName}/config.yml`;
		const { body: result } = await this.githubHttp.getYaml(url, { headers: { accept: "application/vnd.github.v3.raw" } }, ConanCenterReleases);
		return result;
	}
	async fetchDigest({ registryUrl, packageName }, newValue) {
		if (isUndefined(newValue) || isUndefined(registryUrl)) return null;
		const url = ensureTrailingSlash(registryUrl);
		const conanPackage = getConanPackage(packageName);
		const revisionLookUp = joinUrlParts(url, "v2/conans/", conanPackage.conanName, newValue, conanPackage.userAndChannel, "/revisions");
		const { body: digest } = await this.http.getJson(revisionLookUp, ConanLatestRevision);
		return digest;
	}
	getDigest(config, newValue) {
		return this.cached({
			key: `getDigest:${config.registryUrl}:${config.packageName}:${newValue}`,
			fallback: true
		}, () => this.fetchDigest(config, newValue));
	}
	async fetchReleases({ registryUrl, packageName }) {
		const conanPackage = getConanPackage(packageName);
		const userAndChannel = `@${conanPackage.userAndChannel}`;
		if (isString(registryUrl) && ensureTrailingSlash(registryUrl) === "https://center2.conan.io/") return this.getConanCenterReleases(conanPackage.conanName, userAndChannel);
		logger.trace({
			packageName,
			registryUrl
		}, "Looking up conan api dependency");
		// v8 ignore else -- the datasource layer always supplies a registry url
		if (registryUrl) {
			const url = ensureTrailingSlash(registryUrl);
			const lookupUrl = joinUrlParts(url, `v2/conans/search?q=${conanPackage.conanName}`);
			try {
				const rep = await this.http.getJson(lookupUrl, ConanJSON);
				const conanJson = rep.body;
				if (conanJson) {
					logger.trace({ lookupUrl }, "Got conan api result");
					const dep = { releases: [] };
					const conanJsonReleases = conanJson.filter(({ userChannel }) => userChannel === userAndChannel).map(({ version }) => ({ version }));
					dep.releases.push(...conanJsonReleases);
					try {
						if (isArtifactoryServer(rep)) {
							const groups = regEx(/(?<host>.*)\/artifactory\/api\/conan\/(?<repo>[^/]+)/).exec(url)?.groups;
							if (!groups) return dep;
							const semver = get("semver");
							const latestVersion = dep.releases.filter((release) => semver.isVersion(release.version)).sort((a, b) => semver.sortVersions(a.version, b.version)).at(-1)?.version;
							if (!latestVersion) return dep;
							logger.debug(`Conan package ${packageName} has latest version ${latestVersion}`);
							const latestRevisionUrl = joinUrlParts(url, `v2/conans/${conanPackage.conanName}/${latestVersion}/${conanPackage.userAndChannel}/latest`);
							const { body: { revision: packageRev } } = await this.http.getJson(latestRevisionUrl, ConanRevisionJSON);
							const [user, channel] = conanPackage.userAndChannel.split("/");
							const packageUrl = joinUrlParts(`${groups.host}/artifactory/api/storage/${groups.repo}`, `${user}/${conanPackage.conanName}/${latestVersion}/${channel}/${packageRev}/export/conanfile.py?properties=conan.package.url`);
							const { body: conanProperties } = await this.http.getJson(packageUrl, ConanProperties);
							const { sourceUrl } = conanProperties;
							// v8 ignore else -- needs a full artifactory properties fixture
							if (sourceUrl) dep.sourceUrl = sourceUrl;
						}
					} catch (err) {
						logger.debug({ err }, "Couldn't determine Conan package url");
					}
					return dep;
				}
			} catch (err) {
				this.handleGenericErrors(err);
			}
		}
		return null;
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { ConanDatasource };

//# sourceMappingURL=index.js.map