import { joinUrlParts } from "../../../util/url.js";
import "../../versioning/pvp/index.js";
import { Datasource } from "../datasource.js";
import { HackagePackageMetadata } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/datasource/hackage/index.ts
var HackageDatasource = class HackageDatasource extends Datasource {
	static id = "hackage";
	constructor() {
		super(HackageDatasource.id);
	}
	defaultVersioning = "pvp";
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://hackage.haskell.org/"];
	}
	async getReleases(config) {
		const { registryUrl, packageName } = config;
		if (!isNonEmptyString(registryUrl)) return null;
		const url = joinUrlParts(registryUrl, "package", `${encodeURIComponent(packageName)}.json`);
		const res = await this.http.getJson(url, HackagePackageMetadata);
		const releases = [];
		for (const [version, versionStatus] of Object.entries(res.body)) {
			const isDeprecated = versionStatus === "deprecated";
			releases.push(versionToRelease(version, packageName, registryUrl, isDeprecated));
		}
		return { releases };
	}
};
function versionToRelease(version, packageName, registryUrl, isDeprecated) {
	return {
		version,
		changelogUrl: joinUrlParts(registryUrl, "package", `${packageName}-${version}`, "changelog"),
		isDeprecated
	};
}
//#endregion
export { HackageDatasource, versionToRelease };

//# sourceMappingURL=index.js.map