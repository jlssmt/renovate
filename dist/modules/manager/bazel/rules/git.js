import { regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { isHttpUrl } from "../../../../util/url.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../../datasource/github-tags/index.js";
import { z } from "zod/v4";
import parse from "github-url-from-git";
//#region lib/modules/manager/bazel/rules/git.ts
const githubUrlRegex = regEx(/^https:\/\/github\.com\/(?<packageName>[^/]+\/[^/]+)/);
function githubPackageName(input) {
	// istanbul ignore if
	if (!isHttpUrl(input)) logger.once.info({ url: input }, `Bazel: non-https git_repository URL`);
	return parse(input)?.match(githubUrlRegex)?.groups?.packageName;
}
const gitRules = [
	"git_repository",
	"_git_repository",
	"new_git_repository",
	"_new_git_repository"
];
const GitTarget = z.object({
	rule: z.enum(gitRules),
	name: z.string(),
	tag: z.string().optional(),
	commit: z.string().optional(),
	remote: z.string()
}).refine(({ tag, commit }) => !!tag || !!commit).transform(({ rule, name, tag, commit, remote }) => {
	const dep = {
		depType: rule,
		depName: name
	};
	if (tag) dep.currentValue = tag;
	if (commit) dep.currentDigest = commit;
	const githubPackage = githubPackageName(remote);
	if (githubPackage) {
		dep.packageName = githubPackage;
		if (dep.currentValue) dep.datasource = GithubReleasesDatasource.id;
		else dep.datasource = GithubTagsDatasource.id;
	}
	if (!dep.datasource) dep.skipReason = "unsupported-datasource";
	return [dep];
});
//#endregion
export { GitTarget, gitRules };

//# sourceMappingURL=git.js.map