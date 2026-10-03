import { regEx } from "../../../util/regex.js";
import { Datasource } from "../datasource.js";
import { DartResponse } from "./schema.js";
import { isString } from "@sindresorhus/is";
//#region lib/modules/datasource/dart-version/index.ts
const stableVersionRegex = regEx(/^\d+\.\d+\.\d+$/);
/**
* The server returns old svn versions which would need mapping to a version.
* They are very old, so we skip them instead.
* https://github.com/dart-lang/site-www/blob/7d4409c87bb6570b2d8870b20283f81f2b7e08fc/tool/get-dart/dart_sdk_archive/lib/src/svn_versions.dart#L2
*/
const svnVersionRegex = regEx(/^\d+$/);
var DartVersionDatasource = class DartVersionDatasource extends Datasource {
	static id = "dart-version";
	constructor() {
		super(DartVersionDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://storage.googleapis.com"];
	}
	caching = true;
	channels = [
		"stable",
		"beta",
		"dev"
	];
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL: https://github.com/dart-lang/sdk.";
	async getReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const result = {
			homepage: "https://dart.dev/",
			sourceUrl: "https://github.com/dart-lang/sdk",
			registryUrl,
			releases: []
		};
		try {
			for (const channel of this.channels) {
				const resp = (await this.http.getJson(`${registryUrl}/storage/v1/b/dart-archive/o?delimiter=%2F&prefix=channels%2F${channel}%2Frelease%2F&alt=json`, DartResponse)).body;
				const releases = this.getReleasesFromResponse(channel, resp.prefixes);
				result.releases.push(...releases);
			}
		} catch (err) {
			this.handleGenericErrors(err);
		}
		return result.releases.length ? result : null;
	}
	getReleasesFromResponse(channel, prefixes) {
		return prefixes.map((prefix) => this.getVersionFromPrefix(prefix)).filter(isString).filter((version) => {
			if (version === "latest" || svnVersionRegex.test(version) || channel !== "stable" && stableVersionRegex.test(version)) return false;
			return true;
		}).map((version) => ({
			version,
			isStable: channel === "stable"
		}));
	}
	getVersionFromPrefix(prefix) {
		return prefix.split("/").at(-2);
	}
};
//#endregion
export { DartVersionDatasource, stableVersionRegex, svnVersionRegex };

//# sourceMappingURL=index.js.map