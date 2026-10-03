import { fromBase64 } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { detectPlatform } from "../../../util/common.js";
import { api } from "../../versioning/semver/index.js";
import { Datasource } from "../datasource.js";
import { parseGitUrl } from "../../../util/git/url.js";
import { GithubHttp } from "../../../util/http/github.js";
import { GithubContentResponse } from "../../platform/github/schema.js";
import { BitriseStepFile } from "./schema.js";
import { isArray } from "@sindresorhus/is";
//#region lib/modules/datasource/bitrise/index.ts
var BitriseDatasource = class BitriseDatasource extends Datasource {
	static id = "bitrise";
	http;
	constructor() {
		super(BitriseDatasource.id);
		this.http = new GithubHttp(this.id);
	}
	supportsCustomRegistry(_packageName) {
		return true;
	}
	getDefaultRegistryUrls(_packageName) {
		return ["https://github.com/bitrise-io/bitrise-steplib.git"];
	}
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the `published_at` field in the results.";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `source_code_url` field of the release object in the results.";
	async fetchReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const parsedUrl = parseGitUrl(registryUrl);
		if (detectPlatform(registryUrl) !== "github") {
			logger.once.warn({ source: parsedUrl.source }, "Unsupported Git hoster for this datasource");
			return null;
		}
		const result = { releases: [] };
		const massagedPackageName = encodeURIComponent(packageName);
		const baseApiURL = parsedUrl.resource === "github.com" ? "https://api.github.com" : `https://${parsedUrl.resource}/api/v3`;
		const packageUrl = joinUrlParts(baseApiURL, "repos", parsedUrl.full_name, "contents/steps", massagedPackageName);
		const { body: packageRaw } = await this.http.getJson(packageUrl, GithubContentResponse);
		if (!isArray(packageRaw)) {
			logger.warn({
				data: packageRaw,
				url: packageUrl
			}, "Got unexpected response for Bitrise package location");
			return null;
		}
		for (const versionDir of packageRaw.filter((element) => api.isValid(element.name))) {
			const stepUrl = joinUrlParts(packageUrl, versionDir.name, "step.yml");
			const { body } = await this.http.getJson(stepUrl, GithubContentResponse);
			if (!("content" in body)) {
				logger.warn({
					data: body,
					url: stepUrl
				}, "Got unexpected response for Bitrise step location");
				return null;
			}
			if (body.encoding !== "base64") {
				logger.warn({
					encoding: body.encoding,
					data: body,
					url: stepUrl
				}, `Got unexpected encoding for Bitrise step location`);
				return null;
			}
			const content = fromBase64(body.content);
			const { published_at, source_code_url } = BitriseStepFile.parse(content);
			result.releases.push({
				version: versionDir.name,
				releaseTimestamp: published_at,
				sourceUrl: source_code_url
			});
		}
		if (!result.releases.length) return null;
		return {
			...result,
			homepage: `https://bitrise.io/integrations/steps/${packageName}`
		};
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}/${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { BitriseDatasource };

//# sourceMappingURL=index.js.map