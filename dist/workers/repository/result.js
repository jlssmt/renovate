import { CONFIG_SECRETS_EXPOSED, CONFIG_VALIDATION, ConfigErrors, EXTERNAL_HOST_ERROR, MANAGER_LOCKFILE_ERROR, MISSING_API_CREDENTIALS, PlatformErrors, RepositoryErrors, SystemErrors, TemporaryErrors, UNKNOWN_ERROR } from "../../constants/error-messages.js";
import { logger } from "../../logger/index.js";
//#region lib/workers/repository/result.ts
/**
* Exit code per known error group, used when `exitCodeForErrors` is enabled.
*
* `RepositoryErrors` are deliberately absent: they mean the repository is disabled, not that the run failed.
*/
const exitCodes = [
	[SystemErrors, 3],
	[PlatformErrors, 4],
	[ConfigErrors, 5],
	[TemporaryErrors, 6],
	[[
		EXTERNAL_HOST_ERROR,
		MANAGER_LOCKFILE_ERROR,
		MISSING_API_CREDENTIALS
	], 7],
	[[UNKNOWN_ERROR], 8]
];
function getExitCode(res) {
	return exitCodes.find(([errors]) => errors.includes(res))?.[1] ?? 0;
}
function processResult(config, res) {
	const enabledStatuses = [
		CONFIG_SECRETS_EXPOSED,
		CONFIG_VALIDATION,
		MISSING_API_CREDENTIALS
	];
	let status;
	let enabled;
	let onboarded;
	// istanbul ignore next
	if (RepositoryErrors.includes(res)) {
		status = "disabled";
		enabled = false;
	} else if (config.repoIsActivated) {
		status = "activated";
		enabled = true;
		onboarded = true;
	} else if (enabledStatuses.includes(res) || config.repoIsOnboarded) {
		status = "onboarded";
		enabled = true;
		onboarded = true;
	} else if (config.repoIsOnboarded === false) {
		status = "onboarding";
		enabled = true;
		onboarded = false;
	} else {
		logger.debug(`Unknown res: ${res}`);
		status = "unknown";
	}
	logger.debug(`Repository result: ${res}, status: ${status}, enabled: ${enabled}, onboarded: ${onboarded}`);
	return {
		res,
		status,
		enabled,
		onboarded,
		exitCode: getExitCode(res)
	};
}
//#endregion
export { processResult };

//# sourceMappingURL=result.js.map