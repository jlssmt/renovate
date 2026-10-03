import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GiteaTagsDatasource } from "../../datasource/gitea-tags/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { TerraformModuleDatasource } from "../../datasource/terraform-module/index.js";
import { updateArtifacts } from "./artifacts.js";
import { knownDepTypes } from "./dep-types.js";
import { extractPackageFile } from "./extract.js";
//#region lib/modules/manager/terragrunt/index.ts
var terragrunt_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => lockFileMaintenanceIsDelegatedToPackageManager,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	url: () => url
});
const lockFileNames = [".terraform.lock.hcl"];
const lockFileMaintenanceIsDelegatedToPackageManager = "Lock file maintenance is not implemented separately for Terragrunt. It reuses the [Terraform manager](../terraform/index.md)'s lock file logic in-process, so Renovate computes the updated `.terraform.lock.hcl` hashes directly instead of calling the `terragrunt` or `terraform` CLI.";
const url = "https://terragrunt.gruntwork.io/docs";
const categories = ["iac", "terraform"];
const defaultConfig = {
	commitMessageTopic: "Terragrunt dependency {{depName}}",
	managerFilePatterns: ["/(^|/)terragrunt\\.hcl$/"]
};
const supportedDatasources = [
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	GitlabTagsDatasource.id,
	BitbucketTagsDatasource.id,
	GiteaTagsDatasource.id,
	TerraformModuleDatasource.id
];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileMaintenanceIsDelegatedToPackageManager, lockFileNames, supportedDatasources, terragrunt_exports, updateArtifacts, url };

//# sourceMappingURL=index.js.map