import { EXTERNAL_HOST_ERROR, MISSING_API_CREDENTIALS, REPOSITORY_CLOSED_ONBOARDING, REPOSITORY_DISABLED, REPOSITORY_DISABLED_BY_CONFIG, REPOSITORY_NO_CONFIG, SYSTEM_INSUFFICIENT_DISK_SPACE, TEMPORARY_ERROR, UNKNOWN_ERROR } from "../../constants/error-messages.js";
import { logger } from "../../logger/index.js";
import { instrument } from "../../instrumentation/index.js";
import { ExternalHostError } from "../../types/errors/external-host-error.js";
import { raiseConfigWarningIssue, raiseCredentialsWarningIssue } from "./error-config.js";
//#region lib/workers/repository/error.ts
async function handleError(config, err) {
	return instrument("handleError", async () => {
		if (err.message === "uninitiated") {
			logger.info("Repository is uninitiated - skipping");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "empty") {
			logger.info("Repository is empty - skipping");
			delete config.branchList;
			return err.message;
		}
		switch (err.message) {
			case REPOSITORY_CLOSED_ONBOARDING:
			case REPOSITORY_DISABLED:
			case REPOSITORY_DISABLED_BY_CONFIG:
			case REPOSITORY_NO_CONFIG:
				logger.info("Repository is disabled - skipping");
				return err.message;
		}
		if (err.message === "archived") {
			logger.info("Repository is archived - skipping");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "mirror") {
			logger.info("Repository is a mirror - skipping");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "pending-deletion") {
			logger.info("Repository is pending deletion - skipping");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "renamed") {
			logger.info("Repository has been renamed - skipping");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "blocked") {
			delete config.branchList;
			logger.info("Repository is blocked - skipping");
			return err.message;
		}
		if (err.message === "forbidden") {
			delete config.branchList;
			logger.info("Repository is forbidden");
			return err.message;
		}
		if (err.message === "not-found") {
			delete config.branchList;
			logger.error("Repository is not found");
			return err.message;
		}
		if (err.message === "fork-mode-forked") {
			logger.info("Repository is a fork and cannot be processed when Renovate is running in fork mode itself");
			return err.message;
		}
		if (err.message === "fork") {
			logger.info("Repository is a fork and not manually configured - skipping - did you want to run with --fork-processing=enabled?");
			return err.message;
		}
		if (err.message === "cannot-fork") {
			logger.info("Cannot fork repository - skipping");
			return err.message;
		}
		if (err.message === "fork-missing") {
			logger.info("Cannot find fork required for fork mode - skipping");
			return err.message;
		}
		if (err.message === "no-package-files") {
			logger.info("Repository has no package files - skipping");
			return err.message;
		}
		if (err.message === "no-vulnerability-alerts") {
			logger.info("Repository has no vulnerability alerts - skipping");
			return err.message;
		}
		if (err.message === "repository-changed") {
			logger.info("Repository has changed during renovation - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "config-validation") {
			delete config.branchList;
			if (config.configValidationError) logger.error({ err }, "Repository has invalid config");
			else logger.warn({ err }, "Repository has invalid config");
			await raiseConfigWarningIssue(config, err);
			return err.message;
		}
		if (err.message === "missing-api-credentials") {
			delete config.branchList;
			logger.info({ err }, MISSING_API_CREDENTIALS);
			await raiseCredentialsWarningIssue(config, err);
			return err.message;
		}
		if (err.message === "config-secrets-exposed") {
			delete config.branchList;
			logger.warn({ err }, "Repository aborted due to potential secrets exposure");
			return err.message;
		}
		if (err instanceof ExternalHostError) {
			logger.warn({
				hostType: err.hostType,
				packageName: err.packageName,
				err: err.err
			}, "Host error");
			logger.info("External host error causing abort - skipping");
			delete config.branchList;
			return EXTERNAL_HOST_ERROR;
		}
		if (err.message.includes("No space left on device") || err.message === "disk-space") {
			logger.error("Disk space error - skipping");
			delete config.branchList;
			return SYSTEM_INSUFFICIENT_DISK_SPACE;
		}
		if (err.message === "rate-limit-exceeded") {
			logger.warn("Rate limit exceeded - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "out-of-memory") {
			logger.warn("Insufficient memory - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "bad-credentials") {
			logger.warn("Bad credentials - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "integration-unauthorized") {
			logger.warn("Integration unauthorized - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "authentication-error") {
			logger.warn("Authentication error - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "temporary-error") {
			logger.info("Temporary error - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message === "lockfile-error") {
			delete config.branchList;
			logger.info("Lock file error - aborting");
			delete config.branchList;
			return err.message;
		}
		if (err.message.includes("The requested URL returned error: 5")) {
			logger.warn({ err }, "Git error - aborting");
			delete config.branchList;
			return EXTERNAL_HOST_ERROR;
		}
		if (err.message.includes("remote end hung up unexpectedly") || err.message.includes("access denied or repository not exported")) {
			logger.warn({ err }, "Git error - aborting");
			delete config.branchList;
			return EXTERNAL_HOST_ERROR;
		}
		if (err.message.includes("fatal: not a git repository")) {
			delete config.branchList;
			return TEMPORARY_ERROR;
		}
		logger.error({ err }, `Repository has unknown error`);
		delete config.branchList;
		return UNKNOWN_ERROR;
	});
}
//#endregion
export { handleError as default };

//# sourceMappingURL=error.js.map