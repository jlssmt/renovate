import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { DenoDatasource } from "../../datasource/deno/index.js";
import { JsrDatasource } from "../../datasource/jsr/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { getRangeStrategy } from "../npm/range.js";
import "../npm/index.js";
import { updateArtifacts } from "./artifacts.js";
import { extractAllPackageFiles } from "./extract.js";
import { updateDependency } from "./update.js";
//#region lib/modules/manager/deno/index.ts
var deno_exports = /* @__PURE__ */ __exportAll({
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	extractAllPackageFiles: () => extractAllPackageFiles,
	getRangeStrategy: () => getRangeStrategy,
	lockFileMaintenanceIsDelegatedToPackageManager: () => true,
	lockFileNames: () => lockFileNames,
	supersedesManagers: () => supersedesManagers,
	supportedDatasources: () => supportedDatasources,
	supportsLockFileMaintenance: () => true,
	updateArtifacts: () => updateArtifacts,
	updateDependency: () => updateDependency,
	url: () => url
});
const url = "https://docs.deno.com/runtime/getting_started/installation/";
const categories = ["js"];
const supersedesManagers = ["npm"];
const lockFileNames = ["deno.lock"];
const supportedDatasources = [
	NpmDatasource.id,
	JsrDatasource.id,
	DenoDatasource.id
];
const defaultConfig = {
	managerFilePatterns: ["/(^|/)deno\\.lock$/", "/(^|/)deno\\.(json|jsonc)$/"],
	digest: { prBodyDefinitions: { Change: "{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}" } },
	prBodyDefinitions: { Change: "{{#if (equals datasource \"npm\")}}[{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}]({{#if depName}}https://renovatebot.com/diffs/npm/{{replace '/' '%2f' depName}}/{{{currentVersion}}}/{{{newVersion}}}{{/if}}){{else}}{{#if displayFrom}}`{{{displayFrom}}}` -> {{else}}{{#if currentValue}}`{{{currentValue}}}` -> {{/if}}{{/if}}{{#if displayTo}}`{{{displayTo}}}`{{else}}`{{{newValue}}}`{{/if}}{{/if}}" }
};
//#endregion
export { categories, defaultConfig, deno_exports, extractAllPackageFiles, getRangeStrategy, lockFileNames, supersedesManagers, supportedDatasources, updateArtifacts, updateDependency, url };

//# sourceMappingURL=index.js.map