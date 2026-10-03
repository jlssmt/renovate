import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/semver/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { FlutterResponse } from "./schema.js";
//#region lib/modules/datasource/flutter-version/index.ts
const stableVersionRegex = regEx(/^\d+\.\d+\.\d+$/);
var FlutterVersionDatasource = class FlutterVersionDatasource extends Datasource {
	static id = "flutter-version";
	constructor() {
		super(FlutterVersionDatasource.id);
	}
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://storage.googleapis.com"];
	}
	caching = true;
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `release_date` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL: https://github.com/flutter/flutter.";
	async getReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const result = {
			homepage: "https://flutter.dev",
			sourceUrl: "https://github.com/flutter/flutter",
			registryUrl,
			releases: []
		};
		try {
			result.releases = (await this.http.getJson(`${registryUrl}/flutter_infra_release/releases/releases_linux.json`, FlutterResponse)).body.releases.filter(({ version, channel }) => {
				if (stableVersionRegex.test(version)) return channel === "stable";
				return true;
			}).map(({ version, release_date, channel }) => ({
				version,
				releaseTimestamp: asTimestamp(release_date),
				isStable: channel === "stable"
			}));
			return result.releases.length ? result : null;
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
};
//#endregion
export { FlutterVersionDatasource, stableVersionRegex };

//# sourceMappingURL=index.js.map