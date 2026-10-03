import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { TerraformModuleDatasource } from "../../datasource/terraform-module/index.js";
import { TerraformProviderDatasource } from "../../datasource/terraform-provider/index.js";
import { extractPackageFile } from "./extract.js";
import { updateArtifacts } from "./lockfile/index.js";
import { updateLockedDependency } from "./lockfile/update-locked.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/terraform/index.ts
var terraform_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => false,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const lockFileNames = [".terraform.lock.hcl"];
const url = "https://developer.hashicorp.com/terraform/docs";
const categories = ["iac", "terraform"];
const defaultConfig = {
	commitMessageTopic: "Terraform {{depName}}",
	managerFilePatterns: ["**/*.tf", "**/*.tofu"],
	pinDigests: false
};
const supportedDatasources = [
	BitbucketTagsDatasource.id,
	DockerDatasource.id,
	GitTagsDatasource.id,
	GithubTagsDatasource.id,
	GithubReleasesDatasource.id,
	HelmDatasource.id,
	TerraformModuleDatasource.id,
	TerraformProviderDatasource.id
];
//#endregion
export { categories, defaultConfig, extractPackageFile, knownDepTypes, lockFileNames, supportedDatasources, terraform_exports, updateArtifacts, updateLockedDependency, url };

//# sourceMappingURL=index.js.map