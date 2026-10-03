import { logger } from "../../../logger/index.js";
import { id } from "../../versioning/rust-release-channel/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { parseManifestUrl } from "./parse.js";
//#region lib/modules/datasource/rust-version/index.ts
var RustVersionDatasource = class RustVersionDatasource extends Datasource {
	static id = "rust-version";
	supportsCustomRegistry(_packageName) {
		return false;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://static.rust-lang.org"];
	}
	defaultVersioning = id;
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is parsed from the release manifest URL.";
	sourceUrlSupport = "package";
	constructor() {
		super(RustVersionDatasource.id);
	}
	async getManifests(url) {
		const lines = (await this.http.getText(url)).body.split("\n");
		const parsedResults = [];
		for (const line of lines) {
			if (!line.trim()) continue;
			const parsed = parseManifestUrl(line);
			if (parsed) parsedResults.push(parsed);
			else logger.warn({ line }, "Failed to parse manifest URL");
		}
		return parsedResults;
	}
	async fetchReleases({ registryUrl }) {
		const url = new URL("manifests.txt", registryUrl);
		let parsedResults;
		try {
			parsedResults = await this.getManifests(url);
		} catch (err) {
			this.handleGenericErrors(err);
		}
		const filteredResults = parsedResults.filter((result) => result.version !== "stable" && result.version !== "beta");
		const versionMap = /* @__PURE__ */ new Map();
		for (const parsed of filteredResults) {
			const version = parsed.version === "nightly" ? `nightly-${parsed.date}` : parsed.version;
			versionMap.set(version, parsed.date);
		}
		const releaseResult = {
			releases: [],
			homepage: "https://rust-lang.org/",
			sourceUrl: "https://github.com/rust-lang/rust",
			changelogUrl: "https://github.com/rust-lang/rust/blob/main/RELEASES.md"
		};
		for (const [version, date] of versionMap.entries()) {
			const releaseTimestamp = asTimestamp(date);
			releaseResult.releases.push({
				version,
				releaseTimestamp
			});
		}
		return releaseResult;
	}
	getReleases(config) {
		return this.cached({
			key: config.registryUrl,
			cacheable: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { RustVersionDatasource };

//# sourceMappingURL=index.js.map