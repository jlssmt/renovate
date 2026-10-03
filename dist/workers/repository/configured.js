import { REPOSITORY_DISABLED_BY_CONFIG, REPOSITORY_FORKED } from "../../constants/error-messages.js";
//#region lib/workers/repository/configured.ts
function checkIfConfigured(config) {
	if (config.enabled === false) throw new Error(REPOSITORY_DISABLED_BY_CONFIG);
	if (config.isFork && config.forkProcessing !== "enabled") throw new Error(REPOSITORY_FORKED);
}
//#endregion
export { checkIfConfigured };

//# sourceMappingURL=configured.js.map