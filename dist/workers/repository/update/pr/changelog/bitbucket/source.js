import { logger } from "../../../../../../logger/index.js";
import { joinUrlParts } from "../../../../../../util/url.js";
import { BitbucketHttp } from "../../../../../../util/http/bitbucket.js";
import { PagedSourceResults } from "../../../../../../modules/platform/bitbucket/schema.js";
import { getRepoFile } from "../../../../../../modules/platform/bitbucket/files.js";
import { compareChangelogFilePath } from "../common.js";
import { ChangeLogSource } from "../source.js";
import { isNullOrUndefined } from "@sindresorhus/is";
import changelogFilenameRegex from "changelog-filename-regex";
import path from "node:path";
//#region lib/workers/repository/update/pr/changelog/bitbucket/source.ts
const id = "bitbucket-changelog";
var BitbucketChangeLogSource = class extends ChangeLogSource {
	http = new BitbucketHttp(id);
	constructor() {
		super("bitbucket");
	}
	getCompareURL(baseUrl, repository, prevHead, nextHead) {
		return `${baseUrl}${repository}/branches/compare/${nextHead}%0D${prevHead}`;
	}
	getNotesSourceUrl(baseUrl, repository, changelogFile) {
		return joinUrlParts(baseUrl, repository, "src", "HEAD", changelogFile);
	}
	async getReleaseNotesMd(repository, apiBaseUrl, sourceDirectory) {
		logger.trace("bitbucket.getReleaseNotesMd()");
		const repositorySourceURl = joinUrlParts(apiBaseUrl, "2.0/repositories", repository, "src/HEAD", sourceDirectory ?? "");
		const files = (await this.http.getJson(repositorySourceURl, { paginate: true }, PagedSourceResults)).body.values.filter((f) => f.type === "commit_file").filter((f) => changelogFilenameRegex.test(path.basename(f.path)));
		const changelogFile = files.sort((a, b) => compareChangelogFilePath(a.path, b.path)).shift();
		if (isNullOrUndefined(changelogFile)) {
			logger.trace("no changelog file found");
			return null;
		}
		if (files.length !== 0) logger.debug(`Multiple candidates for changelog file, using ${changelogFile.path}`);
		const changelogMd = `${await getRepoFile(this.http, repository, changelogFile.path, changelogFile.commit.hash, { baseUrl: apiBaseUrl })}\n#\n##`;
		return {
			changelogFile: changelogFile.path,
			changelogMd
		};
	}
};
//#endregion
export { BitbucketChangeLogSource, id };

//# sourceMappingURL=source.js.map