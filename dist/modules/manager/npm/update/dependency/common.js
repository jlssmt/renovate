import { logger } from "../../../../../logger/index.js";
//#region lib/modules/manager/npm/update/dependency/common.ts
function getNewGitValue(upgrade) {
	if (!upgrade.currentRawValue) return null;
	if (upgrade.currentDigest) {
		logger.debug("Updating git digest");
		return upgrade.currentRawValue.replace(upgrade.currentDigest, upgrade.newDigest.substring(0, upgrade.currentDigest.length));
	}
	logger.debug("Updating git version tag");
	return upgrade.currentRawValue.replace(upgrade.currentValue, upgrade.newValue);
}
function getNewNpmAliasValue(value, upgrade) {
	if (!upgrade.npmPackageAlias) return null;
	return `npm:${upgrade.packageName}@${value}`;
}
//#endregion
export { getNewGitValue, getNewNpmAliasValue };

//# sourceMappingURL=common.js.map