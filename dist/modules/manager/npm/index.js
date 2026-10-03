import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { detectGlobalConfig } from "./detect.js";
import { knownDepTypes, supportsDynamicDepTypesNote } from "./dep-types.js";
import { extractAllPackageFiles } from "./extract/index.js";
import { getRangeStrategy } from "./range.js";
import { updateDependency } from "./update/dependency/index.js";
import { updateLockedDependency } from "./update/locked-dependency/index.js";
import { bumpPackageVersion } from "./update/package-version/index.js";
import "./update/index.js";
//#region lib/modules/manager/npm/index.ts
var npm_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	detectGlobalConfig: () => detectGlobalConfig,
	displayName: () => "npm",
	extractAllPackageFiles: () => extractAllPackageFiles,
	getRangeStrategy: () => getRangeStrategy,
	knownDepTypes: () => knownDepTypes,
	lockFileMaintenanceIsDelegatedToPackageManager: () => lockFileMaintenanceIsDelegatedToPackageManager,
	lockFileNames: () => lockFileNames,
	supportedDatasources: () => supportedDatasources,
	supportsDynamicDepTypesNote: () => supportsDynamicDepTypesNote,
	supportsLockFileMaintenance: () => true,
	supportsNpmrc: () => true,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	updateLockedDependency: () => updateLockedDependency,
	url: () => url
});
const lockFileNames = [
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock"
];
const lockFileMaintenanceIsDelegatedToPackageManager = "Delegated to the underlying package manager CLI - `npm`, `pnpm`, or Yarn - depending on which lock file is present.";
const url = "https://docs.npmjs.com";
const categories = ["js"];
const defaultConfig = {
	managerFilePatterns: [
		"/(^|/)package\\.json$/",
		"/(^|/)pnpm-workspace\\.yaml$/",
		"/(^|/)\\.yarnrc\\.yml$/"
	],
	digest: { prBodyDefinitions: { Change: "{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}" } },
	prBodyDefinitions: { Change: "[{{#if displayFrom}}`{{{displayFrom}}}` → {{else}}{{#if currentValue}}`{{{currentValue}}}` → {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}})" }
};
const supportedDatasources = [
	GithubTagsDatasource.id,
	NpmDatasource.id,
	NodeVersionDatasource.id
];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, detectGlobalConfig, extractAllPackageFiles, getRangeStrategy, knownDepTypes, lockFileMaintenanceIsDelegatedToPackageManager, lockFileNames, npm_exports, supportedDatasources, supportsDynamicDepTypesNote, updateArtifacts, updateDependency, updateLockedDependency, url };

//# sourceMappingURL=index.js.map