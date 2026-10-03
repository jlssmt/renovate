import { CONFIG_GIT_URL_UNAVAILABLE } from "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { parseGitAuthor } from "../../../util/git/author.js";
//#region lib/modules/platform/github/utils.ts
function warnIfDefaultGitAuthorEmail(gitAuthor, isGHE) {
	if (isGHE === true) return;
	if (parseGitAuthor(gitAuthor ?? "renovate@whitesourcesoftware.com")?.address === "renovate@whitesourcesoftware.com") logger.once.warn({ documentationUrl: "https://github.com/renovatebot/renovate/discussions/39309" }, "Using the default gitAuthor email address, renovate@whitesourcesoftware.com, is not recommended on GitHub.com, as this corresponds to a user owned by Mend and used by users of the forking-renovate[bot] GitHub App. For security and authenticity reasons, Mend enables \"Vigilant Mode\" on this account to visibly flag unsigned commits. As an account you do not control, you will not be able to sign commits. If you are comfortable with the `Unverified` signatures on each commit, no work is needed. Otherwise, it is recommended to migrate to a user account you own");
}
function getRepoUrl(repository, gitUrl, sshUrl, endpoint, authToken) {
	if (gitUrl === "ssh") {
		if (!sshUrl) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
		logger.debug(`Using ssh URL: ${sshUrl}`);
		return sshUrl;
	}
	const url = parseUrl(endpoint.href);
	if (authToken) {
		const [username, password] = authToken.split(":");
		url.username = username;
		url.password = password ?? "";
	}
	url.host = url.host.replace("api.github.com", "github.com");
	url.pathname = `${repository}.git`;
	return url.href;
}
function isGithubEnterpriseServer(host) {
	return host.type === "ghes";
}
//#endregion
export { getRepoUrl, isGithubEnterpriseServer, warnIfDefaultGitAuthorEmail };

//# sourceMappingURL=utils.js.map