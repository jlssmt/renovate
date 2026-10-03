import { regEx } from "../../../util/regex.js";
import { parseUrl } from "../../../util/url.js";
//#region lib/modules/manager/puppet/common.ts
const RE_REPOSITORY_GENERIC_GIT_SSH_FORMAT = regEx(/^git@[^:]*:(?<repository>.+)$/);
function parseGitOwnerRepo(git, githubUrl) {
	const genericGitSsh = RE_REPOSITORY_GENERIC_GIT_SSH_FORMAT.exec(git);
	if (genericGitSsh?.groups) return genericGitSsh.groups.repository.replace(regEx(/\.git$/), "");
	if (githubUrl) return git.replace(regEx(/^github:/), "").replace(regEx(/^git\+/), "").replace(regEx(/^https:\/\/github\.com\//), "").replace(regEx(/\.git$/), "");
	const url = parseUrl(git);
	if (!url) return null;
	return url.pathname.replace(regEx(/\.git$/), "").replace(regEx(/^\//), "");
}
function isGithubUrl(gitUrl, parsedUrl) {
	return parsedUrl?.host === "github.com" || gitUrl.startsWith("git@github.com");
}
//#endregion
export { RE_REPOSITORY_GENERIC_GIT_SSH_FORMAT, isGithubUrl, parseGitOwnerRepo };

//# sourceMappingURL=common.js.map