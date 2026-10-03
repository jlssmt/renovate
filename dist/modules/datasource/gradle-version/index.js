import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/gradle/index.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { GradleReleases } from "./schema.js";
//#region lib/modules/datasource/gradle-version/index.ts
var GradleVersionDatasource = class GradleVersionDatasource extends Datasource {
	static id = "gradle-version";
	constructor() {
		super(GradleVersionDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://services.gradle.org/versions/all"];
	}
	defaultVersioning = id;
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `buildTime` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL: https://github.com/gradle/gradle.";
	async _getReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		let releases;
		try {
			releases = (await this.http.getJson(registryUrl, GradleReleases)).body.filter((release) => !release.snapshot && !release.nightly).map((release) => {
				const { version, buildTime } = release;
				const result = {
					version,
					gitRef: GradleVersionDatasource.getGitRef(release.version),
					releaseTimestamp: asTimestamp(buildTime)
				};
				if (release.broken) result.isDeprecated = true;
				return result;
			});
		} catch (err) {
			this.handleGenericErrors(err);
		}
		const res = {
			releases,
			homepage: "https://gradle.org",
			sourceUrl: "https://github.com/gradle/gradle"
		};
		if (res.releases.length) return res;
		return null;
	}
	getReleases(config) {
		return withCache({
			namespace: `datasource-${GradleVersionDatasource.id}`,
			key: `${config.registryUrl}`,
			fallback: true
		}, () => this._getReleases(config));
	}
	/**
	* Calculate `gitTag` based on `version`:
	*   - `8.1.2` -> `v8.1.2`
	*   - `8.2` -> `v8.2.0`
	*   - `8.2-rc-1` -> `v8.2.0-RC1`
	*   - `8.2-milestone-1` -> `v8.2.0-M1`
	*/
	static getGitRef(version) {
		const [versionPart, typePart, unstablePart] = version.split(regEx(/-(?<type>[a-z]+)-/));
		let suffix = "";
		if (typePart === "rc") suffix = `-RC${unstablePart}`;
		else if (typePart === "milestone") suffix = `-M${unstablePart}`;
		const [major, minor, patch = "0"] = versionPart.split(".");
		return `v${major}.${minor}.${patch}${suffix}`;
	}
};
//#endregion
export { GradleVersionDatasource };

//# sourceMappingURL=index.js.map