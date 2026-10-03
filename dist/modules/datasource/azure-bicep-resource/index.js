import { id } from "../../versioning/azure-rest-api/index.js";
import { Datasource } from "../datasource.js";
import { BicepResourceVersionIndex } from "./schema.js";
//#region lib/modules/datasource/azure-bicep-resource/index.ts
const BICEP_TYPES_INDEX_URL = "https://raw.githubusercontent.com/Azure/bicep-types-az/main/generated/index.json";
var AzureBicepResourceDatasource = class AzureBicepResourceDatasource extends Datasource {
	static id = "azure-bicep-resource";
	defaultConfig = {
		commitMessageTopic: "resource {{depName}}",
		commitMessageExtra: "to {{{newVersion}}}",
		prBodyColumns: ["Resource", "Change"],
		prBodyDefinitions: { Resource: "{{{depNameLinked}}}" }
	};
	defaultVersioning = id;
	constructor() {
		super(AzureBicepResourceDatasource.id);
	}
	getChangelogUrl(packageName) {
		const firstSlashIndex = packageName.indexOf("/");
		return `https://learn.microsoft.com/en-us/azure/templates/${packageName.slice(0, firstSlashIndex)}/change-log/${packageName.slice(firstSlashIndex + 1)}`;
	}
	async fetchReleases(getReleasesConfig) {
		const resourceVersionIndex = await this.getResourceVersionIndex();
		const packageName = getReleasesConfig.packageName.toLowerCase();
		const versions = resourceVersionIndex[packageName];
		if (!versions?.length) return null;
		const changelogUrl = this.getChangelogUrl(packageName);
		return { releases: versions.map((version) => ({
			version,
			changelogUrl: `${changelogUrl}#${version}`
		})) };
	}
	getReleases(config) {
		return this.cached({
			key: `getReleases-${config.packageName}`,
			fallback: true,
			cacheable: true
		}, () => this.fetchReleases(config));
	}
	async fetchResourceVersionIndex() {
		const { body } = await this.http.getJson(BICEP_TYPES_INDEX_URL, BicepResourceVersionIndex);
		return body;
	}
	getResourceVersionIndex() {
		return this.cached({
			key: "getResourceVersionIndex",
			ttlMinutes: 1440,
			cacheable: true
		}, () => this.fetchResourceVersionIndex());
	}
};
//#endregion
export { AzureBicepResourceDatasource };

//# sourceMappingURL=index.js.map