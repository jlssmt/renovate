import { regEx } from "../../../util/regex.js";
import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { id, isValid as isVersion } from "../../versioning/semver/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
//#region lib/modules/datasource/golang-version/index.ts
const lineTerminationRegex = regEx(`\r?\n`);
const releaseBeginningChar = "	{";
const releaseTerminationChar = "	},";
const releaseDateRegex = regEx(`Date\\{(?<year>\\d+),\\s+(?<month>\\d+),\\s+(?<day>\\d+)\\}`);
const releaseVersionRegex = regEx(`Version\\{(?<versionMajor>\\d+),\\s+(?<versionMinor>\\d+),\\s+(?<patch>\\d+)\\}`);
const releaseFutureRegex = regEx(`Future:\\s+true`);
var GolangVersionDatasource = class GolangVersionDatasource extends Datasource {
	static id = "golang-version";
	constructor() {
		super(GolangVersionDatasource.id);
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://raw.githubusercontent.com/golang/website"];
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `Date` field in the results.";
	sourceUrlSupport = "package";
	sourceUrlNote = "We use the URL: https://github.com/golang/go.";
	async fetchReleases({ registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const res = {
			homepage: "https://go.dev/",
			sourceUrl: "https://github.com/golang/go",
			releases: []
		};
		const golangVersionsUrl = joinUrlParts(registryUrl, "/HEAD/internal/history/release.go");
		const lines = (await this.http.getText(golangVersionsUrl)).body.split(lineTerminationRegex);
		const startOfReleases = lines.indexOf("var Releases = []*Release{");
		if (startOfReleases === -1) throw new ExternalHostError(/* @__PURE__ */ new Error("Invalid file - could not find the Releases section"));
		lines.splice(0, startOfReleases + 1);
		let release = { version: void 0 };
		let skipFutureRelease = false;
		while (lines.length !== 0) {
			const line = lines.shift();
			if (line === releaseBeginningChar) {
				if (release.version !== void 0) throw new ExternalHostError(/* @__PURE__ */ new Error("Invalid file - unexpected error while parsing a release"));
			} else if (line === releaseTerminationChar) {
				if (skipFutureRelease) skipFutureRelease = false;
				else {
					if (release.version === void 0) throw new ExternalHostError(/* @__PURE__ */ new Error("Invalid file - release has empty version"));
					res.releases.push(release);
				}
				release = { version: void 0 };
			} else {
				if (releaseFutureRegex.test(line)) skipFutureRelease = true;
				const releaseDateMatch = releaseDateRegex.exec(line);
				if (releaseDateMatch?.groups) {
					const year = releaseDateMatch.groups.year.padStart(4, "0");
					const month = releaseDateMatch.groups.month.padStart(2, "0");
					const day = releaseDateMatch.groups.day.padStart(2, "0");
					release.releaseTimestamp = asTimestamp(`${year}-${month}-${day}T00:00:00.000Z`);
				}
				const releaseVersionMatch = releaseVersionRegex.exec(line);
				if (releaseVersionMatch?.groups) {
					release.version = `${releaseVersionMatch.groups.versionMajor}.${releaseVersionMatch.groups.versionMinor}.${releaseVersionMatch.groups.patch}`;
					if (!isVersion(release.version)) throw new ExternalHostError(/* @__PURE__ */ new Error(`Version ${release.version} is not a valid semver`));
				}
			}
		}
		if (res.releases.length === 0) throw new ExternalHostError(/* @__PURE__ */ new Error(`Invalid file - zero releases extracted`));
		return res;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { GolangVersionDatasource };

//# sourceMappingURL=index.js.map