import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { ensureTrailingSlash } from "../../../util/url.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { JenkinsPluginsInfoResponse, JenkinsPluginsVersionsResponse } from "./schema.js";
//#region lib/modules/datasource/jenkins-plugins/index.ts
var JenkinsPluginsDatasource = class JenkinsPluginsDatasource extends Datasource {
	static id = "jenkins-plugins";
	constructor() {
		super(JenkinsPluginsDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://updates.jenkins.io"];
	}
	registryStrategy = "hunt";
	static packageInfoPath = "current/update-center.actual.json";
	static packageVersionsPath = "current/plugin-versions.json";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The releaseTimestamp is determined from the `releaseTimestamp` or `buildDate` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "The source URL is determined from the `scm` field in the results.";
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const updateSiteUrl = ensureTrailingSlash(registryUrl);
		const plugin = (await this.getJenkinsPluginInfo(updateSiteUrl))[packageName];
		if (!plugin) return null;
		const result = clone(plugin);
		const releases = (await this.getJenkinsPluginVersions(updateSiteUrl))[packageName];
		result.releases = releases ? clone(releases) : [];
		return result;
	}
	async _getJenkinsPluginInfo(updateSiteUrl) {
		const { plugins } = await this.getJenkinsUpdateCenterResponse(`${updateSiteUrl}${JenkinsPluginsDatasource.packageInfoPath}`, JenkinsPluginsInfoResponse);
		const info = {};
		for (const name of Object.keys(plugins)) info[name] = {
			releases: [],
			sourceUrl: plugins[name]?.scm
		};
		return info;
	}
	getJenkinsPluginInfo(updateSiteUrl) {
		return withCache({
			namespace: `datasource-${JenkinsPluginsDatasource.id}`,
			key: "info",
			ttlMinutes: 1440
		}, () => this._getJenkinsPluginInfo(updateSiteUrl));
	}
	async _getJenkinsPluginVersions(updateSiteUrl) {
		const { plugins } = await this.getJenkinsUpdateCenterResponse(`${updateSiteUrl}${JenkinsPluginsDatasource.packageVersionsPath}`, JenkinsPluginsVersionsResponse);
		const versions = {};
		for (const name of Object.keys(plugins)) versions[name] = Object.keys(plugins[name]).map((version) => {
			const downloadUrl = plugins[name][version]?.url;
			const buildDate = plugins[name][version]?.buildDate;
			const releaseTimestamp = plugins[name][version]?.releaseTimestamp ?? asTimestamp(buildDate);
			const jenkins = plugins[name][version]?.requiredCore;
			const constraints = jenkins ? { jenkins: [`>=${jenkins}`] } : void 0;
			return {
				version,
				downloadUrl,
				releaseTimestamp,
				...constraints && { constraints }
			};
		});
		return versions;
	}
	getJenkinsPluginVersions(updateSiteUrl) {
		return withCache({
			namespace: `datasource-${JenkinsPluginsDatasource.id}`,
			key: "versions"
		}, () => this._getJenkinsPluginVersions(updateSiteUrl));
	}
	async getJenkinsUpdateCenterResponse(url, schema) {
		let response;
		try {
			logger.debug(`jenkins-plugins: Fetching Jenkins plugins from ${url}`);
			const startTime = Date.now();
			response = (await this.http.getJson(url, schema)).body;
			const durationMs = Math.round(Date.now() - startTime);
			logger.debug({ durationMs }, `jenkins-plugins: Fetched Jenkins plugins from ${url}`);
		} catch (err) /* istanbul ignore next */ {
			this.handleGenericErrors(err);
		}
		return response;
	}
};
//#endregion
export { JenkinsPluginsDatasource };

//# sourceMappingURL=index.js.map