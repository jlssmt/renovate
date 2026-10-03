import { logger } from "../../../../../../logger/index.js";
import { GitlabHttp } from "../../../../../../util/http/gitlab.js";
import { compareChangelogFilePath } from "../common.js";
import { ChangeLogSource } from "../source.js";
import changelogFilenameRegex from "changelog-filename-regex";
//#region lib/workers/repository/update/pr/changelog/gitlab/source.ts
const id = "gitlab-changelog";
var GitLabChangeLogSource = class extends ChangeLogSource {
	http = new GitlabHttp(id);
	constructor() {
		super("gitlab");
	}
	getCompareURL(baseUrl, repository, prevHead, nextHead) {
		return `${baseUrl}${repository}/compare/${prevHead}...${nextHead}`;
	}
	hasValidRepository(repository) {
		return repository.split("/").length >= 2;
	}
	async getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory) {
		logger.trace("gitlab.getReleaseNotesMd()");
		const apiPrefix = `${apiBaseUrl}projects/${encodeURIComponent(repository)}/repository/`;
		const files = (await this.http.getJsonUnchecked(`${apiPrefix}tree?per_page=100${sourceDirectory ? `&path=${sourceDirectory}` : ""}`, { paginate: true })).body.filter((f) => f.type === "blob").filter((f) => changelogFilenameRegex.test(f.name));
		if (!files.length) {
			logger.trace("no changelog file found");
			return null;
		}
		const { path: changelogFile, id: blobId } = files.sort((a, b) => compareChangelogFilePath(a.name, b.name)).shift();
		/* istanbul ignore if */
		if (files.length !== 0) logger.debug(`Multiple candidates for changelog file, using ${changelogFile}`);
		return {
			changelogFile,
			changelogMd: `${(await this.http.getText(`${apiPrefix}blobs/${blobId}/raw`)).body}\n#\n##`
		};
	}
	async getReleaseList(project, _release) {
		logger.trace("gitlab.getReleaseList()");
		const apiBaseUrl = project.apiBaseUrl;
		const repository = project.repository;
		const apiUrl = `${apiBaseUrl}projects/${encodeURIComponent(repository)}/releases`;
		return (await this.http.getJsonUnchecked(`${apiUrl}?per_page=100`, { paginate: true })).body.map((release) => ({
			url: `${project.baseUrl}${repository}/-/releases/${release.tag_name}`,
			notesSourceUrl: apiUrl,
			name: release.name,
			body: release.description,
			tag: release.tag_name
		}));
	}
};
//#endregion
export { GitLabChangeLogSource, id };

//# sourceMappingURL=source.js.map