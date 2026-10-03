import { logger } from "../../../../../../logger/index.js";
import { GiteaHttp } from "../../../../../../util/http/gitea.js";
import { Releases } from "../../../../../../modules/datasource/gitea-releases/schema.js";
import { getRepoFile, listRepoDir } from "../../../../../../modules/platform/gitea/files.js";
import { compareChangelogFilePath } from "../common.js";
import { ChangeLogSource } from "../source.js";
import changelogFilenameRegex from "changelog-filename-regex";
//#region lib/workers/repository/update/pr/changelog/gitea/source.ts
const id = "gitea-changelog";
var GiteaChangeLogSource = class extends ChangeLogSource {
	/**
	* Forgejo is a fork of Gitea and serves the same API, so it inherits every
	* method below and only replaces the Http client.
	*/
	http = new GiteaHttp(id);
	/** Platforms which speak the Gitea API pass their own id. */
	constructor(platform = "gitea") {
		super(platform);
	}
	getCompareURL(baseUrl, repository, prevHead, nextHead) {
		return `${baseUrl}${repository}/compare/${prevHead}...${nextHead}`;
	}
	hasValidRepository(repository) {
		return repository.split("/").length === 2;
	}
	async getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory) {
		logger.trace(`${this.platform}.getReleaseNotesMd()`);
		const files = (await listRepoDir(this.http, repository, sourceDirectory, {
			baseUrl: apiBaseUrl,
			paginate: false
		})).filter((f) => f.type === "file" && changelogFilenameRegex.test(f.name));
		if (!files.length) {
			logger.trace("no changelog file found");
			return null;
		}
		const { path: changelogFile } = files.sort((a, b) => compareChangelogFilePath(a.path, b.path)).shift();
		/* istanbul ignore if */
		if (files.length !== 0) logger.debug(`Multiple candidates for changelog file, using ${changelogFile}`);
		const fileRes = await getRepoFile(this.http, repository, changelogFile, null, { baseUrl: apiBaseUrl });
		// istanbul ignore if: should never happen
		if (fileRes.type !== "file" || !fileRes.content) {
			logger.debug(`Missing content for changelog file, using ${changelogFile}`);
			return null;
		}
		return {
			changelogFile,
			changelogMd: `${fileRes.contentString}\n#\n##`
		};
	}
	async getReleaseList(project, _release) {
		logger.trace(`${this.platform}.getReleaseList()`);
		const apiUrl = `${project.apiBaseUrl}repos/${project.repository}/releases`;
		return (await this.http.getJson(`${apiUrl}?draft=false`, { paginate: true }, Releases)).body.map((release) => ({
			url: `${project.baseUrl}${project.repository}/releases/tag/${release.tag_name}`,
			notesSourceUrl: apiUrl,
			name: release.name,
			body: release.body,
			tag: release.tag_name
		}));
	}
};
//#endregion
export { GiteaChangeLogSource, id };

//# sourceMappingURL=source.js.map