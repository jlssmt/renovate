import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray, deduplicateArray } from "../../../util/array.js";
import { toBase64 } from "../../../util/string.js";
import { addSecretForSanitizing } from "../../../util/sanitize.js";
import { logger } from "../../../logger/index.js";
import { ensureTrailingSlash, parseUrl } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { Json } from "../../../util/schema-utils/index.js";
import { id } from "../../versioning/pep440/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { Datasource } from "../datasource.js";
import { parse } from "../../../util/html.js";
import { isGoogleArtifactRegistry } from "../util.js";
import { isGitHubRepo, normalizePythonDepName, pypiDatasourceId } from "./common.js";
import { findPypiIndexCredentials } from "./host-rules.js";
import { PypiResponse, PypiSimpleResponse } from "./schema.js";
import { isNonEmptyString } from "@sindresorhus/is";
import changelogFilenameRegex from "changelog-filename-regex";
//#region lib/modules/datasource/pypi/index.ts
var PypiDatasource = class PypiDatasource extends Datasource {
	static id = pypiDatasourceId;
	constructor() {
		super(PypiDatasource.id);
	}
	caching = true;
	supportsCustomRegistry(_packageName) {
		return true;
	}
	static defaultURL = getEnv().PIP_INDEX_URL ?? "https://pypi.org/pypi/";
	getDefaultRegistryUrls(_packageName) {
		return [PypiDatasource.defaultURL];
	}
	defaultVersioning = id;
	registryStrategy = "merge";
	releaseTimestampSupport = true;
	releaseTimestampNote = "The release timestamp is determined from the earliest `upload_time` field of the files of a version. When using the Simple API, timestamps are available if the server supports the JSON-based Simple API (PEP 691).";
	sourceUrlSupport = "release";
	sourceUrlNote = "The source URL is determined from the `homepage` field if it is a github repository, else we use the `project_urls` field.";
	async getReleases({ packageName, registryUrl }) {
		let dependency = null;
		const hostUrl = ensureTrailingSlash(registryUrl.replace("https://pypi.org/simple", "https://pypi.org/pypi"));
		const normalizedLookupName = normalizePythonDepName(packageName);
		if (hostUrl.endsWith("/simple/") || hostUrl.endsWith("/+simple/")) {
			logger.trace({
				packageName,
				hostUrl
			}, "Looking up pypi simple dependency");
			dependency = await this.getSimpleDependency(normalizedLookupName, hostUrl);
		} else {
			logger.trace({
				packageName,
				hostUrl
			}, "Looking up pypi api dependency");
			try {
				dependency = await this.getDependency(normalizedLookupName, hostUrl);
			} catch (err) {
				logger.trace({
					packageName,
					hostUrl,
					err
				}, "Looking up pypi simple dependency via fallback");
				dependency = await this.getSimpleDependency(normalizedLookupName, hostUrl);
			}
		}
		return dependency;
	}
	sanitizeLookupUrl(lookupUrl, parsedUrl) {
		if (!parsedUrl.username && !parsedUrl.password) return lookupUrl;
		parsedUrl.username = "";
		parsedUrl.password = "";
		return parsedUrl.toString();
	}
	async getAuthHeaders(lookupUrl) {
		const parsedUrl = parseUrl(lookupUrl);
		// v8 ignore if -- TODO: refactor to cover this branch through public behavior again
		if (!parsedUrl) {
			logger.once.debug({ lookupUrl }, "Failed to parse URL");
			return {
				headers: {},
				lookupUrl
			};
		}
		if (!isGoogleArtifactRegistry(parsedUrl.hostname)) return {
			headers: {},
			lookupUrl
		};
		const { username, password } = await findPypiIndexCredentials(lookupUrl);
		if (!username && !password) return {
			headers: {},
			lookupUrl
		};
		const auth = toBase64(`${username ?? ""}:${password ?? ""}`);
		addSecretForSanitizing(auth);
		return {
			headers: { authorization: `Basic ${auth}` },
			lookupUrl: this.sanitizeLookupUrl(lookupUrl, parsedUrl)
		};
	}
	async getDependency(packageName, hostUrl) {
		const lookupUrl = new URL(`${normalizePythonDepName(packageName)}/json`, hostUrl).href;
		const dependency = { releases: [] };
		logger.trace({ lookupUrl }, "Pypi api got lookup");
		const { headers, lookupUrl: sanitizedUrl } = await this.getAuthHeaders(lookupUrl);
		const rep = await this.http.getJson(sanitizedUrl, { headers }, PypiResponse);
		const dep = rep?.body;
		if (rep.authorization) dependency.isPrivate = true;
		logger.trace({ lookupUrl }, "Got pypi api result");
		if (dep.info?.home_page) {
			dependency.homepage = dep.info.home_page;
			if (isGitHubRepo(dep.info.home_page)) dependency.sourceUrl = dep.info.home_page.replace("http://", "https://");
		}
		if (dep.info?.project_urls) for (const [name, projectUrl] of Object.entries(dep.info.project_urls)) {
			const lower = name.toLowerCase();
			if (projectUrl && !dependency.sourceUrl && (lower.startsWith("repo") || lower === "code" || lower === "source" || isGitHubRepo(projectUrl))) dependency.sourceUrl = projectUrl;
			if (!dependency.changelogUrl && ([
				"changelog",
				"change log",
				"changes",
				"release notes",
				"news",
				"what's new"
			].includes(lower) || changelogFilenameRegex.exec(lower))) dependency.changelogUrl = projectUrl;
		}
		if (dep.releases) dependency.releases = PypiDatasource.toReleases(dep.releases);
		return dependency;
	}
	static getEarliestTimestamp(releases) {
		let earliest = null;
		for (const { upload_time } of releases) {
			const timestamp = asTimestamp(upload_time);
			if (timestamp && (!earliest || timestamp < earliest)) earliest = timestamp;
		}
		return earliest;
	}
	static extractVersionFromLinkText(text, packageName) {
		const lcText = text.toLowerCase();
		const normalizedSrcText = normalizePythonDepName(text);
		const srcPrefix = `${packageName}-`;
		if (!normalizedSrcText.startsWith(srcPrefix)) return null;
		const normalizedLengthDiff = lcText.length - normalizedSrcText.length;
		const res = lcText.slice(srcPrefix.length + normalizedLengthDiff);
		const srcSuffix = [
			".tar.gz",
			".tar.bz2",
			".tar.xz",
			".zip",
			".tgz"
		].find((suffix) => lcText.endsWith(suffix));
		if (srcSuffix) return res.slice(0, -srcSuffix.length);
		if (lcText.endsWith(".whl") && lcText.split("-").length > 2) return res.split("-")[0];
		return null;
	}
	static cleanSimpleHtml(html) {
		return html.replace(regEx(/<\/?pre>/), "").replace(regEx(/data-requires-python="(?<before>[^"]*?)>(?<after>[^"]*?)"/g), "data-requires-python=\"$<before>&gt;$<after>\"").replace(regEx(/data-requires-python="(?<before>[^"]*?)<(?<after>[^"]*?)"/g), "data-requires-python=\"$<before>&lt;$<after>\"");
	}
	static getSimpleReleasesFromHtml(html, packageName) {
		const links = parse(PypiDatasource.cleanSimpleHtml(html)).querySelectorAll("a");
		const releases = {};
		for (const link of Array.from(links)) {
			const version = PypiDatasource.extractVersionFromLinkText(link.text?.trim(), packageName);
			if (version) {
				const release = { yanked: link.hasAttribute("data-yanked") };
				const requiresPython = link.getAttribute("data-requires-python");
				if (requiresPython) release.requires_python = requiresPython;
				(releases[version] ??= []).push(release);
			}
		}
		return releases;
	}
	static getSimpleReleasesFromJson(json, packageName) {
		const releases = {};
		const parsed = Json.pipe(PypiSimpleResponse).safeParse(json);
		if (!parsed.success) {
			logger.once.warn({
				packageName,
				err: parsed.error
			}, "Failed to parse JSON-based Simple API response");
			return null;
		}
		for (const file of parsed.data.files) {
			const version = PypiDatasource.extractVersionFromLinkText(file.filename, packageName);
			if (version) (releases[version] ??= []).push(file);
		}
		return releases;
	}
	async getSimpleDependency(packageName, hostUrl) {
		const lookupUrl = new URL(ensureTrailingSlash(normalizePythonDepName(packageName)), hostUrl).href;
		const dependency = { releases: [] };
		const { headers: authHeaders, lookupUrl: sanitizedUrl } = await this.getAuthHeaders(lookupUrl);
		const headers = {
			...authHeaders,
			accept: "application/vnd.pypi.simple.v1+json, application/vnd.pypi.simple.v1+html; q=0.1, text/html; q=0.01"
		};
		let response;
		try {
			response = await this.http.getText(sanitizedUrl, { headers });
		} catch (err) {
			const httpErr = err instanceof ExternalHostError ? err.err : err;
			const statusCode = httpErr instanceof RequestError ? httpErr.response?.statusCode : void 0;
			if (statusCode !== 406) throw err;
			logger.trace({
				packageName,
				hostUrl,
				statusCode
			}, "Registry rejected negotiated Accept header, retrying without it");
			response = await this.http.getText(sanitizedUrl, { headers: authHeaders });
		}
		const dep = response?.body;
		if (!dep) {
			logger.trace({ dependency: packageName }, "pip package not found");
			return null;
		}
		if (response.authorization) dependency.isPrivate = true;
		const contentType = response.headers["content-type"];
		const isJson = !!contentType && contentType.includes("json");
		const looksLikeJson = dep.trimStart().startsWith("{");
		if (isJson) {
			if (looksLikeJson) {
				const releases = PypiDatasource.getSimpleReleasesFromJson(dep, packageName);
				if (!releases) return null;
				dependency.releases = PypiDatasource.toReleases(releases);
				return dependency;
			}
			logger.debug({
				packageName,
				hostUrl,
				contentType
			}, "Parsing Simple API response as HTML, as it is labeled as JSON but does not look like it");
		}
		const htmlReleases = PypiDatasource.getSimpleReleasesFromHtml(dep, packageName);
		dependency.releases = PypiDatasource.toReleases(htmlReleases);
		if (dependency.releases.length > 0 || !looksLikeJson) return dependency;
		logger.debug({
			packageName,
			hostUrl,
			contentType
		}, "Retrying Simple API response as JSON, as it is not labeled as JSON but looks like it");
		const jsonReleases = PypiDatasource.getSimpleReleasesFromJson(dep, packageName);
		if (!jsonReleases) return null;
		dependency.releases = PypiDatasource.toReleases(jsonReleases);
		return dependency;
	}
	/**
	* The files of a version are not ordered by upload time, so use the earliest one: that is when the version was first published, which is what `minimumReleaseAge` needs.
	*/
	static toReleases(releases) {
		return Object.keys(releases).map((version) => {
			const versionReleases = coerceArray(releases[version]);
			const isDeprecated = versionReleases.some(({ yanked }) => yanked);
			const result = { version };
			const releaseTimestamp = PypiDatasource.getEarliestTimestamp(versionReleases);
			if (releaseTimestamp) result.releaseTimestamp = releaseTimestamp;
			if (isDeprecated) result.isDeprecated = isDeprecated;
			const pythonConstraints = versionReleases.map(({ requires_python }) => requires_python);
			result.constraints = { python: pythonConstraints.some((constraint) => !isNonEmptyString(constraint)) ? [] : deduplicateArray(pythonConstraints.filter(isNonEmptyString)) };
			return result;
		});
	}
};
//#endregion
export { PypiDatasource };

//# sourceMappingURL=index.js.map