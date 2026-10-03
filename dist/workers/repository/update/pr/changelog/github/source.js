import { GlobalConfig } from "../../../../../../config/global.js";
import { fromBase64 } from "../../../../../../util/string.js";
import { logger } from "../../../../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts, parseUrl } from "../../../../../../util/url.js";
import { find } from "../../../../../../util/host-rules.js";
import { GithubHttp } from "../../../../../../util/http/github.js";
import { memCacheProvider } from "../../../../../../util/http/cache/memory-http-cache-provider.js";
import { queryReleases } from "../../../../../../util/github/graphql/index.js";
import { compareChangelogFilePath } from "../common.js";
import { ChangeLogSource } from "../source.js";
import changelogFilenameRegex from "changelog-filename-regex";
//#region lib/workers/repository/update/pr/changelog/github/source.ts
const id = "github-changelog";
var GitHubChangeLogSource = class extends ChangeLogSource {
	http = new GithubHttp(id);
	constructor() {
		super("github");
	}
	getCompareURL(baseUrl, repository, prevHead, nextHead) {
		return `${baseUrl}${repository}/compare/${prevHead}...${nextHead}`;
	}
	shouldSkipPackage(config) {
		if (config.sourceUrl === "https://github.com/DefinitelyTyped/DefinitelyTyped") {
			logger.trace("No release notes for @types");
			return true;
		}
		return false;
	}
	hasValidToken(config) {
		const sourceUrl = config.sourceUrl;
		const host = parseUrl(sourceUrl)?.host;
		const manager = config.manager;
		const packageName = config.packageName;
		const url = sourceUrl.startsWith("https://github.com/") ? this.getAPIBaseUrl(config) : sourceUrl;
		const { token } = find({
			hostType: "github",
			url,
			readOnly: true
		});
		// istanbul ignore if
		if (host && !token) {
			if (host.endsWith(".github.com") || host === "github.com") {
				if (!GlobalConfig.get("githubTokenWarn")) {
					logger.debug({
						manager,
						packageName,
						sourceUrl
					}, "GitHub token warning has been suppressed. Skipping release notes retrieval");
					return { isValid: false };
				}
				logger.warn({
					manager,
					packageName,
					sourceUrl
				}, "No github.com token has been configured. Skipping release notes retrieval");
				return {
					isValid: false,
					error: "MissingGithubToken"
				};
			}
			logger.debug({
				manager,
				packageName,
				sourceUrl
			}, "Repository URL does not match any known github hosts - skipping changelog retrieval");
			return { isValid: false };
		}
		return { isValid: true };
	}
	async getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory) {
		logger.trace("github.getReleaseNotesMd()");
		const apiPrefix = `${ensureTrailingSlash(apiBaseUrl)}repos/${repository}`;
		const { default_branch: defaultBranch = "HEAD" } = (await this.http.getJsonUnchecked(apiPrefix, { cacheProvider: memCacheProvider })).body;
		const res = await this.http.getJsonUnchecked(`${apiPrefix}/git/trees/${defaultBranch}${sourceDirectory ? "?recursive=1" : ""}`, { cacheProvider: memCacheProvider });
		// istanbul ignore if
		if (res.body.truncated) logger.debug(`Git tree truncated repository:${repository}`);
		const allFiles = res.body.tree.filter((f) => f.type === "blob");
		let files = [];
		if (sourceDirectory?.length) files = allFiles.filter((f) => f.path.startsWith(sourceDirectory)).filter((f) => changelogFilenameRegex.test(f.path.replace(ensureTrailingSlash(sourceDirectory), "")));
		if (!files.length) files = allFiles.filter((f) => changelogFilenameRegex.test(f.path));
		if (!files.length) {
			logger.trace("no changelog file found");
			return null;
		}
		const { path: changelogFile, sha } = files.sort((a, b) => compareChangelogFilePath(a.path, b.path)).shift();
		/* istanbul ignore if */
		if (files.length !== 0) logger.debug(`Multiple candidates for changelog file, using ${changelogFile}`);
		const fileRes = await this.http.getJsonUnchecked(`${apiPrefix}/git/blobs/${sha}`, { cacheProvider: memCacheProvider });
		return {
			changelogFile,
			changelogMd: `${fromBase64(fileRes.body.content)}\n#\n##`
		};
	}
	async getReleaseList(project, _release) {
		logger.trace("github.getReleaseList()");
		const apiBaseUrl = project.apiBaseUrl;
		const repository = project.repository;
		const notesSourceUrl = joinUrlParts(apiBaseUrl, "repos", repository, "releases");
		return (await queryReleases({
			registryUrl: apiBaseUrl,
			packageName: repository
		}, this.http)).map(({ url, id: releaseId, version: tag, name, description: body }) => ({
			url,
			notesSourceUrl,
			id: releaseId,
			tag,
			name,
			body
		}));
	}
};
//#endregion
export { GitHubChangeLogSource, id };

//# sourceMappingURL=source.js.map