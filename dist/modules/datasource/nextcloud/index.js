import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/semver/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { Applications } from "./schema.js";
//#region lib/modules/datasource/nextcloud/index.ts
var NextcloudDatasource = class NextcloudDatasource extends Datasource {
	static id = "nextcloud";
	static defaultTranslationLanguage = "en";
	static sourceUrlRegex = regEx(/(?<prefix>.*github.com\/nextcloud)(?<suffix>\/.*)/);
	defaultVersioning = id;
	constructor() {
		super(NextcloudDatasource.id);
	}
	async fetchReleases({ packageName, registryUrl }) {
		if (!registryUrl) return null;
		const application = (await this.http.getJson(registryUrl, Applications)).body.find((a) => a.id === packageName);
		if (!application) return null;
		const sourceUrlMatches = NextcloudDatasource.sourceUrlRegex.exec(application.website);
		const result = {
			releases: [],
			homepage: application.website,
			registryUrl,
			changelogUrl: sourceUrlMatches?.groups ? `${sourceUrlMatches.groups.prefix}-releases${sourceUrlMatches.groups.suffix}` : application.website
		};
		if (sourceUrlMatches !== null) result.sourceUrl = application.website;
		for (const release of application.releases) {
			const changelogContent = release.translations[NextcloudDatasource.defaultTranslationLanguage]?.changelog ?? null;
			result.releases.push({
				version: release.version,
				releaseTimestamp: asTimestamp(release.created),
				changelogContent: changelogContent !== null && changelogContent.length > 0 ? changelogContent : void 0,
				isStable: !release.isNightly
			});
		}
		return result;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { NextcloudDatasource };

//# sourceMappingURL=index.js.map