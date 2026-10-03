import { id } from "../../versioning/unity3d/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { UnityReleasesJSON } from "./schema.js";
//#region lib/modules/datasource/unity3d/index.ts
var Unity3dDatasource = class Unity3dDatasource extends Datasource {
	static baseUrl = "https://services.api.unity.com/unity/editor/release/v1/releases";
	static homepage = "https://unity.com/";
	static streams = {
		lts: `${Unity3dDatasource.baseUrl}?stream=LTS`,
		tech: `${Unity3dDatasource.baseUrl}?stream=TECH`,
		alpha: `${Unity3dDatasource.baseUrl}?stream=ALPHA`,
		beta: `${Unity3dDatasource.baseUrl}?stream=BETA`
	};
	static legacyStreams = {
		lts: `${Unity3dDatasource.homepage}releases/editor/lts-releases.xml`,
		stable: `${Unity3dDatasource.homepage}releases/editor/releases.xml`,
		beta: `${Unity3dDatasource.homepage}releases/editor/beta/latest.xml`
	};
	static limit = 25;
	static id = "unity3d";
	getDefaultRegistryUrls(_packageName) {
		return [Unity3dDatasource.streams.lts];
	}
	defaultVersioning = id;
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `releaseDate` field in the results.";
	constructor() {
		super(Unity3dDatasource.id);
	}
	translateStream(registryUrl) {
		const legacyKey = Object.keys(Unity3dDatasource.legacyStreams).find((key) => Unity3dDatasource.legacyStreams[key] === registryUrl);
		if (legacyKey) {
			if (legacyKey === "stable") return Unity3dDatasource.streams.lts;
			return Unity3dDatasource.streams[legacyKey];
		}
		return registryUrl;
	}
	async getByStream(registryUrl, withHash) {
		const translatedRegistryUrl = this.translateStream(registryUrl);
		const isStable = translatedRegistryUrl === Unity3dDatasource.streams.lts;
		let total = null;
		const result = {
			releases: [],
			homepage: Unity3dDatasource.homepage,
			registryUrl: translatedRegistryUrl
		};
		for (let offset = 0; total === null || offset < total; offset += Unity3dDatasource.limit) {
			const response = await this.http.getJson(`${translatedRegistryUrl}&limit=${Unity3dDatasource.limit}&offset=${offset}`, UnityReleasesJSON);
			for (const release of response.body.results) result.releases.push({
				version: withHash ? `${release.version} (${release.shortRevision})` : release.version,
				releaseTimestamp: asTimestamp(release.releaseDate),
				changelogUrl: release.releaseNotes.url,
				isStable
			});
			total ??= response.body.total;
		}
		return result;
	}
	async fetchReleases({ packageName, registryUrl }) {
		return await this.getByStream(registryUrl, packageName === "m_EditorVersionWithRevision");
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { Unity3dDatasource };

//# sourceMappingURL=index.js.map