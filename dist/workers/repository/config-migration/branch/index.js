import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { getMigrationBranchName } from "../common.js";
import { ConfigMigrationCommitMessageFactory } from "./commit-message.js";
import { createConfigMigrationBranch } from "./create.js";
import { rebaseMigrationBranch } from "./rebase.js";
import { isUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/config-migration/branch/index.ts
async function checkConfigMigrationBranch(config, migratedConfigData) {
	logger.debug("checkConfigMigrationBranch()");
	const configMigrationCheckboxState = config.dependencyDashboardChecks?.configMigrationCheckboxState;
	if (!config.configMigration && (isUndefined(configMigrationCheckboxState) || configMigrationCheckboxState === "no-checkbox" || configMigrationCheckboxState === "unchecked")) {
		logger.debug("Config migration needed but config migration is disabled and checkbox not checked or not present.");
		return { result: "no-migration-branch" };
	}
	const configMigrationBranch = getMigrationBranchName(config);
	const branchPr = await migrationPrExists(configMigrationBranch, config.baseBranch);
	if (!branchPr) {
		const closedPrConfig = {
			branchName: configMigrationBranch,
			prTitle: new ConfigMigrationCommitMessageFactory(config, migratedConfigData.filename).getPrTitle(),
			state: "closed",
			targetBranch: config.baseBranch
		};
		const closedPr = await platform.findPr(closedPrConfig);
		if (closedPr) {
			logger.debug("Closed config migration PR found.");
			if (configMigrationCheckboxState !== "checked") {
				logger.debug("Config migration is enabled and needed. But a closed pr exists and checkbox is not checked. Skipping migration branch creation.");
				return { result: "no-migration-branch" };
			}
			logger.debug("Closed migration PR found and checkbox is checked. Try to delete this old branch and create a new one.");
			await handlePr(config, closedPr);
		}
	}
	let result;
	if (branchPr) {
		logger.debug("Config Migration PR already exists");
		if (await isMigrationBranchModified(config, configMigrationBranch)) {
			logger.debug("Config Migration branch has been modified. Skipping branch rebase.");
			result = "migration-branch-modified";
		} else {
			await rebaseMigrationBranch(config, migratedConfigData);
			if (platform.refreshPr) {
				const configMigrationPr = await platform.getBranchPr(configMigrationBranch, config.baseBranch);
				if (configMigrationPr) await platform.refreshPr(configMigrationPr.number);
			}
			result = "migration-branch-exists";
		}
	} else {
		logger.debug("Config Migration PR does not exist");
		logger.debug("Need to create migration PR");
		await createConfigMigrationBranch(config, migratedConfigData);
		result = "migration-branch-exists";
	}
	if (!GlobalConfig.get("dryRun")) await scm.checkoutBranch(configMigrationBranch);
	return {
		migrationBranch: configMigrationBranch,
		result
	};
}
async function migrationPrExists(branchName, targetBranch) {
	return await platform.getBranchPr(branchName, targetBranch);
}
async function handlePr(config, pr) {
	if (await scm.branchExists(pr.sourceBranch)) {
		if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would delete branch ${pr.sourceBranch}`);
		else await scm.deleteBranch(pr.sourceBranch);
	}
}
async function isMigrationBranchModified(config, configMigrationBranch) {
	const baseBranch = config.defaultBranch;
	return await scm.isBranchModified(configMigrationBranch, baseBranch);
}
//#endregion
export { checkConfigMigrationBranch, migrationPrExists };

//# sourceMappingURL=index.js.map