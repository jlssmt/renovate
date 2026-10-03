import { regEx } from "../../../../../../util/regex.js";
import { logger } from "../../../../../../logger/index.js";
import { ensureTrailingSlash, joinUrlParts, parseUrl } from "../../../../../../util/url.js";
import { BitbucketServerHttp } from "../../../../../../util/http/bitbucket-server.js";
import { Files } from "../../../../../../modules/platform/bitbucket-server/schema.js";
import { compareChangelogFilePath } from "../common.js";
import { ChangeLogSource } from "../source.js";
import changelogFilenameRegex from "changelog-filename-regex";
import path from "node:path";
//#region lib/workers/repository/update/pr/changelog/bitbucket-server/source.ts
const id = "bitbucket-server-changelog";
const subfolderRegex = regEx("(?<subfolder>.+/)(?:projects|scm)/");
const gitUrlRegex = regEx("/(?<project>[^/]+)/(?<repo>[^/]+)\\.git$");
const webUrlRegex = regEx("/projects/(?<project>[^/]+)/repos/(?<repo>[^/]+)");
var BitbucketServerChangeLogSource = class extends ChangeLogSource {
	http = new BitbucketServerHttp(id);
	constructor() {
		super("bitbucket-server");
	}
	getBaseUrl(config) {
		const parsedUrl = parseUrl(config.sourceUrl);
		if (parsedUrl?.host) {
			const protocol = parsedUrl.protocol.replace(regEx(/^git\+/), "");
			const subfolder = subfolderRegex.exec(parsedUrl.pathname)?.groups?.subfolder ?? "/";
			return `${protocol}//${parsedUrl.host}${subfolder}`;
		}
		return "";
	}
	getCompareURL(baseUrl, repository, prevHead, nextHead) {
		const [projectKey, repositorySlug] = repository.split("/");
		return `${baseUrl}projects/${projectKey}/repos/${repositorySlug}/compare/commits?sourceBranch=${nextHead}&targetBranch=${prevHead}`;
	}
	getRepositoryFromUrl(config) {
		const parsedUrl = parseUrl(config.sourceUrl);
		if (parsedUrl) {
			const match = (parsedUrl.pathname.endsWith(".git") ? gitUrlRegex : webUrlRegex).exec(parsedUrl.pathname);
			if (match?.groups) return `${match.groups.project}/${match.groups.repo}`;
		}
		return "";
	}
	getNotesSourceUrl(baseUrl, repository, changelogFile) {
		const [projectKey, repositorySlug] = repository.split("/");
		return joinUrlParts(baseUrl, "projects", projectKey, "repos", repositorySlug, "browse", changelogFile, "?at=HEAD");
	}
	async getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory) {
		logger.info("bitbucketServer.getReleaseNotesMd()");
		const [projectKey, repositorySlug] = repository.split("/");
		const apiRepoBaseUrl = joinUrlParts(apiBaseUrl, `projects`, projectKey, "repos", repositorySlug);
		const repositorySourceURl = joinUrlParts(apiRepoBaseUrl, "files", sourceDirectory ?? "");
		const changelogFiles = (await this.http.getJson(repositorySourceURl, { paginate: true }, Files)).body.filter((f) => changelogFilenameRegex.test(path.basename(f)));
		let changelogFile = changelogFiles.sort((a, b) => compareChangelogFilePath(a, b)).shift();
		if (!changelogFile) {
			logger.trace("no changelog file found");
			return null;
		}
		changelogFile = `${sourceDirectory ? ensureTrailingSlash(sourceDirectory) : ""}${changelogFile}`;
		if (changelogFiles.length !== 0) logger.debug(`Multiple candidates for changelog file, using ${changelogFile}`);
		const changelogMd = `${(await this.http.getText(joinUrlParts(apiRepoBaseUrl, "raw", changelogFile))).body}\n#\n##`;
		return {
			changelogFile,
			changelogMd
		};
	}
};
//#endregion
export { BitbucketServerChangeLogSource, id };

//# sourceMappingURL=source.js.map