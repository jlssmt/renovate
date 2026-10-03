import { get, set } from "./cache/memory/index.js";
import { GlobalConfig } from "../config/global.js";
import { logger } from "../logger/index.js";
import { find } from "./host-rules.js";
import { GithubReleaseAttachmentsDatasource } from "../modules/datasource/github-release-attachments/index.js";
import { GithubReleasesDatasource } from "../modules/datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../modules/datasource/github-tags/index.js";
//#region lib/util/check-token.ts
function checkGithubToken(packageFiles = {}) {
	const { token } = find({
		hostType: "github",
		url: "https://api.github.com"
	});
	if (token) {
		logger.trace("GitHub token is found");
		return;
	}
	if (!GlobalConfig.get("githubTokenWarn")) {
		logger.trace("GitHub token warning is disabled");
		return;
	}
	const githubDeps = [];
	const deps = Object.values(packageFiles).flat().map((file) => file.deps).flat();
	for (const dep of deps) if (!dep.skipReason && (dep.datasource === GithubTagsDatasource.id || dep.datasource === GithubReleasesDatasource.id || dep.datasource === GithubReleaseAttachmentsDatasource.id)) {
		dep.skipReason = "github-token-required";
		// v8 ignore else -- TODO: add test #40625
		if (dep.depName) githubDeps.push(dep.depName);
	}
	if (githubDeps.length > 0) {
		// v8 ignore else -- TODO: add test #40625
		if (!get("github-token-required-warning-logged")) {
			const withoutDuplicates = [...new Set(githubDeps)];
			logger.warn({ githubDeps: withoutDuplicates }, `GitHub token is required for some dependencies`);
			set("github-token-required-warning-logged", true);
		}
	}
}
function isGithubPersonalAccessToken(token) {
	return token.startsWith("ghp_");
}
function isGithubServerToServerToken(token) {
	return token.startsWith("ghs_");
}
function isGithubFineGrainedPersonalAccessToken(token) {
	return token.startsWith("github_pat_");
}
function findGithubToken(searchResult) {
	return searchResult?.token?.replace("x-access-token:", "");
}
function takePersonalAccessTokenIfPossible(githubToken, gitTagsGithubToken) {
	if (gitTagsGithubToken && isGithubPersonalAccessToken(gitTagsGithubToken)) {
		logger.debug("Using GitHub Personal Access Token (git-tags)");
		return gitTagsGithubToken;
	}
	if (githubToken && isGithubPersonalAccessToken(githubToken)) {
		logger.debug("Using GitHub Personal Access Token");
		return githubToken;
	}
	if (gitTagsGithubToken && isGithubFineGrainedPersonalAccessToken(gitTagsGithubToken)) {
		logger.debug("Using GitHub Fine-grained Personal Access Token (git-tags)");
		return gitTagsGithubToken;
	}
	if (githubToken && isGithubFineGrainedPersonalAccessToken(githubToken)) {
		logger.debug("Using GitHub Fine-grained Personal Access Token");
		return githubToken;
	}
	if (gitTagsGithubToken) {
		if (isGithubServerToServerToken(gitTagsGithubToken)) logger.debug("Using GitHub Server-to-Server token (git-tags)");
		else logger.debug("Using unknown GitHub token type (git-tags)");
		return gitTagsGithubToken;
	}
	if (githubToken) {
		if (isGithubServerToServerToken(githubToken)) logger.debug("Using GitHub Server-to-Server token");
		else logger.debug("Using unknown GitHub token type");
	}
	return githubToken;
}
//#endregion
export { checkGithubToken, findGithubToken, isGithubFineGrainedPersonalAccessToken, isGithubPersonalAccessToken, isGithubServerToServerToken, takePersonalAccessTokenIfPossible };

//# sourceMappingURL=check-token.js.map