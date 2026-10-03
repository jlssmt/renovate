import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { getEnv } from "../../../util/env.js";
import { ForgejoTagsDatasource } from "../../datasource/forgejo-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { extractPackageFile } from "./extract.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/pre-commit/index.ts
var pre_commit_exports = /* @__PURE__ */ __exportAll({
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "pre-commit";
const url = "https://pre-commit.com";
const defaultConfig = {
	commitMessageTopic: "pre-commit hook {{depName}}",
	enabled: false,
	managerFilePatterns: ["/(^|/)\\.pre-commit-config\\.ya?ml$/"],
	prBodyNotes: getEnv().RENOVATE_X_SUPPRESS_PRE_COMMIT_WARNING ? [] : ["Note: The `pre-commit` manager in Renovate is not supported by the `pre-commit` maintainers or community. Please do not report any problems there, instead [create a Discussion in the Renovate repository](https://github.com/renovatebot/renovate/discussions/new) if you have any questions."]
};
const supportedDatasources = [
	ForgejoTagsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id
];
//#endregion
export { defaultConfig, displayName, extractPackageFile, knownDepTypes, pre_commit_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map