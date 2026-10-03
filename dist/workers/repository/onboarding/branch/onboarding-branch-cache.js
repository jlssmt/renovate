import { logger } from "../../../../logger/index.js";
import { getCache } from "../../../../util/cache/repository/index.js";
import { getBranchCommit } from "../../../../util/git/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { isNonEmptyObject, isNonEmptyString, isUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/onboarding/branch/onboarding-branch-cache.ts
function setOnboardingCache(defaultBranchSha, onboardingBranchSha, isConflicted, isModified) {
	if (!(isNonEmptyString(defaultBranchSha) && isNonEmptyString(onboardingBranchSha))) {
		logger.debug("Onboarding cache not updated");
		return;
	}
	const cache = getCache();
	const onboardingCache = {
		defaultBranchSha,
		onboardingBranchSha,
		isConflicted,
		isModified
	};
	if (cache.onboardingBranchCache) logger.debug({ onboardingCache }, "Update Onboarding Cache");
	else logger.debug({ onboardingCache }, "Create Onboarding Cache");
	cache.onboardingBranchCache = onboardingCache;
}
function deleteOnboardingCache() {
	const cache = getCache();
	if (cache?.onboardingBranchCache) {
		logger.debug("Delete Onboarding Cache");
		delete cache.onboardingBranchCache;
	}
}
function hasOnboardingBranchChanged(onboardingBranch) {
	const cache = getCache();
	const onboardingSha = getBranchCommit(onboardingBranch);
	if (cache.onboardingBranchCache) return onboardingSha !== cache.onboardingBranchCache.onboardingBranchSha;
	return true;
}
async function isOnboardingBranchModified(onboardingBranch, defaultBranch) {
	const onboardingCache = getCache().onboardingBranchCache;
	const onboardingSha = getBranchCommit(onboardingBranch);
	let isModified = false;
	if (isNonEmptyObject(onboardingCache) && onboardingSha === onboardingCache.onboardingBranchSha && !isUndefined(onboardingCache.isModified)) return onboardingCache.isModified;
	isModified = await scm.isBranchModified(onboardingBranch, defaultBranch);
	return isModified;
}
function getOnboardingFileNameFromCache() {
	return getCache().onboardingBranchCache?.configFileName;
}
function getOnboardingConfigFromCache() {
	return getCache().onboardingBranchCache?.configFileParsed;
}
function setOnboardingConfigDetails(configFileName, configFileParsed) {
	const cache = getCache();
	if (cache.onboardingBranchCache) {
		cache.onboardingBranchCache.configFileName = configFileName;
		cache.onboardingBranchCache.configFileParsed = configFileParsed;
	}
}
async function isOnboardingBranchConflicted(defaultBranch, onboardingBranch) {
	const onboardingCache = getCache().onboardingBranchCache;
	const onboardingSha = getBranchCommit(onboardingBranch);
	const defaultBranchSha = getBranchCommit(defaultBranch);
	let isConflicted = false;
	if (isNonEmptyObject(onboardingCache) && defaultBranchSha === onboardingCache.defaultBranchSha && onboardingSha === onboardingCache.onboardingBranchSha && !isUndefined(onboardingCache.isConflicted)) return onboardingCache.isConflicted;
	isConflicted = await scm.isBranchConflicted(defaultBranch, onboardingBranch);
	return isConflicted;
}
//#endregion
export { deleteOnboardingCache, getOnboardingConfigFromCache, getOnboardingFileNameFromCache, hasOnboardingBranchChanged, isOnboardingBranchConflicted, isOnboardingBranchModified, setOnboardingCache, setOnboardingConfigDetails };

//# sourceMappingURL=onboarding-branch-cache.js.map