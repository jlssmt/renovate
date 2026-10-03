import { getRangeStrategy } from "../../../../modules/manager/index.js";
//#region lib/workers/repository/process/lookup/range-strategy.ts
/**
* Ask the manager which `rangeStrategy` to use, then apply the
* vulnerability-alert overrides on top of it.
*/
function resolveRangeStrategy(config) {
	const rangeStrategy = getRangeStrategy(config);
	if (!config.isVulnerabilityAlert) return rangeStrategy;
	// istanbul ignore next
	if (rangeStrategy === "update-lockfile" && !config.lockedVersion) return "bump";
	if (!config.currentValue && config.lockedVersion) return "update-lockfile";
	return rangeStrategy;
}
//#endregion
export { resolveRangeStrategy };

//# sourceMappingURL=range-strategy.js.map