import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { extractPackageFile } from "./extract.js";
import { bumpPackageVersion } from "./update.js";
import { knownDepTypes } from "./dep-types.js";
//#region lib/modules/manager/ocb/index.ts
var ocb_exports = /* @__PURE__ */ __exportAll({
	bumpPackageVersion: () => bumpPackageVersion,
	categories: () => categories,
	defaultConfig: () => defaultConfig,
	displayName: () => displayName,
	extractPackageFile: () => extractPackageFile,
	knownDepTypes: () => knownDepTypes,
	supportedDatasources: () => supportedDatasources,
	url: () => url
});
const displayName = "OpenTelemetry Collector Builder (ocb)";
const url = "https://github.com/open-telemetry/opentelemetry-collector/tree/main/cmd/builder";
const categories = ["golang"];
const defaultConfig = { managerFilePatterns: [] };
const supportedDatasources = [GoDatasource.id];
//#endregion
export { bumpPackageVersion, categories, defaultConfig, displayName, extractPackageFile, knownDepTypes, ocb_exports, supportedDatasources, url };

//# sourceMappingURL=index.js.map