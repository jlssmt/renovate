import { logger } from "../../../../logger/index.js";
import { getElapsedHours } from "../../../../util/date.js";
//#region lib/workers/repository/update/pr/pr-fingerprint.ts
function generatePrBodyFingerprintConfig(config) {
	const filteredUpgrades = config.upgrades.map((upgrade) => {
		return {
			depName: upgrade.depName,
			displayFrom: upgrade.displayFrom,
			displayTo: upgrade.displayTo,
			displayPending: upgrade.displayPending,
			gitRef: upgrade.gitRef,
			hasReleaseNotes: upgrade.hasReleaseNotes,
			prBodyDefinitions: upgrade.prBodyDefinitions,
			prBodyNotes: upgrade.prBodyNotes,
			repoName: upgrade.repoName
		};
	});
	return {
		automerge: config.automerge,
		automergeSchedule: config.automergeSchedule,
		baseBranch: config.baseBranch,
		filteredUpgrades,
		hasReleaseNotes: config.hasReleaseNotes,
		isPin: config.isPin,
		prBodyTemplate: config.prBodyTemplate,
		prFooter: config.prFooter,
		prHeader: config.prHeader,
		prTitle: config.prTitle,
		rebaseWhen: config.rebaseWhen,
		recreateWhen: config.recreateWhen,
		schedule: config.schedule,
		stopUpdating: config.stopUpdating,
		timezone: config.timezone,
		updateType: config.updateType,
		warnings: config.warnings,
		pendingVersions: config.pendingVersions
	};
}
function validatePrCache(prCache, bodyFingerprint) {
	if (prCache.bodyFingerprint !== bodyFingerprint) {
		logger.debug("PR fingerprints mismatch, processing PR");
		return false;
	}
	if (getElapsedHours(prCache.lastEdited) < 24) {
		logger.debug("PR cache matches but it has been edited in the past 24hrs, so processing PR");
		return false;
	}
	logger.debug("PR cache matches and no PR changes in last 24hrs, so skipping PR body check");
	return true;
}
//#endregion
export { generatePrBodyFingerprintConfig, validatePrCache };

//# sourceMappingURL=pr-fingerprint.js.map