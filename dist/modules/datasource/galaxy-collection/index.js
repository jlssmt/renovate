import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts } from "../../../util/url.js";
import { id } from "../../versioning/pep440/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { map } from "../../../util/promises.js";
import { GalaxyV3, GalaxyV3DetailedVersion, GalaxyV3Versions } from "./schema.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/datasource/galaxy-collection/index.ts
const ansibleProtocolRegex = regEx(/^\S+\/api\/ansible\/.+/);
const repositoryRegex = regEx(/^\S+\/api\/galaxy\/content\/(?<repository>[^/]+)/);
var GalaxyCollectionDatasource = class GalaxyCollectionDatasource extends Datasource {
	static id = "galaxy-collection";
	constructor() {
		super(GalaxyCollectionDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	registryStrategy = "hunt";
	getDefaultRegistryUrls(_packageName) {
		return ["https://galaxy.ansible.com/api/"];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `created_at` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The `sourceUrl` is determined from the `repository` field in the results.";
	async fetchReleases({ packageName, registryUrl }) {
		const baseUrl = this.constructBaseUrl(registryUrl, packageName);
		const { val: baseProject, err: baseErr } = await this.http.getJsonSafe(baseUrl, GalaxyV3).onError((err) => {
			if (!(err instanceof RequestError && err.response?.statusCode === 404)) logger.warn({
				url: baseUrl,
				datasource: this.id,
				packageName,
				err
			}, "Error fetching from url");
		}).unwrap();
		if (baseErr) this.handleGenericErrors(baseErr);
		const versionsUrl = ensureTrailingSlash(joinUrlParts(baseUrl, "versions"));
		const { val: rawReleases, err: versionsErr } = await this.http.getJsonSafe(versionsUrl, GalaxyV3Versions).onError((err) => {
			logger.warn({
				url: versionsUrl,
				datasource: this.id,
				packageName,
				err
			}, "Error fetching from url");
		}).unwrap();
		if (versionsErr) this.handleGenericErrors(versionsErr);
		const releases = rawReleases.map((value) => {
			return {
				...value,
				isDeprecated: baseProject.deprecated
			};
		});
		const enrichedReleases = await map(releases, (release) => this.getVersionDetails(packageName, versionsUrl, release), { concurrency: 4 });
		return {
			releases: enrichedReleases.filter(isTruthy),
			sourceUrl: enrichedReleases.find((release) => baseProject.highest_version.version === release.version)?.sourceUrl
		};
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases:${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
	constructBaseUrl(registryUrl, packageName) {
		const [namespace, projectName] = packageName.split(".");
		if (ansibleProtocolRegex.test(registryUrl)) return ensureTrailingSlash(joinUrlParts(registryUrl, "api/v3/collections", namespace, projectName));
		const repository = repositoryRegex.exec(registryUrl)?.groups?.repository ?? "published";
		return ensureTrailingSlash(joinUrlParts(registryUrl, "v3/plugin/ansible/content", repository, "collections/index", namespace, projectName));
	}
	async fetchVersionDetails(packageName, versionsUrl, basicRelease) {
		const detailedVersionUrl = ensureTrailingSlash(joinUrlParts(versionsUrl, basicRelease.version));
		const { val: rawDetailedVersion, err: versionsErr } = await this.http.getJsonSafe(detailedVersionUrl, GalaxyV3DetailedVersion).onError((err) => {
			logger.warn({
				url: versionsUrl,
				datasource: this.id,
				packageName,
				err
			}, "Error fetching from url");
		}).unwrap();
		if (versionsErr) this.handleGenericErrors(versionsErr);
		return {
			...rawDetailedVersion,
			isDeprecated: basicRelease.isDeprecated,
			releaseTimestamp: basicRelease.releaseTimestamp
		};
	}
	getVersionDetails(packageName, versionsUrl, basicRelease) {
		return this.cached({
			key: `getVersionDetails:${versionsUrl}:${basicRelease.version}`,
			ttlMinutes: 10080
		}, () => this.fetchVersionDetails(packageName, versionsUrl, basicRelease));
	}
};
//#endregion
export { GalaxyCollectionDatasource };

//# sourceMappingURL=index.js.map