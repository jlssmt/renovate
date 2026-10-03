import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { getRangeStrategy } from "../npm/range.js";
import { updateDependency } from "../npm/update/dependency/index.js";
import "../npm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractAllPackageFiles } from "./extract.js";
//#region lib/modules/manager/bun/index.ts
var bun_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	getRangeStrategy: () => getRangeStrategy,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supersedesManagers: () => supersedesManagers,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	supportsNpmrc: () => true,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://bun.sh/docs/cli/install";
const categories = ["js"];
const supersedesManagers = ["npm"];
const lockFileNames = ["bun.lockb", "bun.lock"];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)bun\\.lockb?$/", "/(^|/)package\\.json$/"],
	digest: { prBodyDefinitions: { Change: "{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}" } },
	prBodyDefinitions: { Change: "[{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}})" }
};
const supportedDatasources = [GithubTagsDatasource.id, NpmDatasource.id];
//#endregion
export { bun_exports, categories, defaultConfig, extractAllPackageFiles, getRangeStrategy, lockFileNames, supersedesManagers, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map