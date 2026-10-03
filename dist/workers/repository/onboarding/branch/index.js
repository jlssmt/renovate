import { REPOSITORY_NO_PACKAGE_FILES } from "../../../../constants/error-messages.js";
import { coerceObject } from "../../../../util/object.js";
import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { mergeChildConfig } from "../../../../config/utils.js";
import { getInheritedOrGlobal } from "../../../../util/common.js";
import { getCache } from "../../../../util/cache/repository/index.js";
import { getBranchCommit, setGitAuthor } from "../../../../util/git/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import "../../../../config/index.js";
import { getOnboardingConfig } from "./config.js";
import { deleteOnboardingCache, hasOnboardingBranchChanged, isOnboardingBranchConflicted, isOnboardingBranchModified, setOnboardingCache } from "./onboarding-branch-cache.js";
import { OnboardingState } from "../common.js";
import { mergeRenovateConfig } from "../../init/merge.js";
import { extractAllDependencies } from "../../extract/index.js";
import { checkIfConfigured } from "../../configured.js";
import { getOnboardingPr, isOnboarded } from "./check.js";
import { createOnboardingBranch } from "./create.js";
import { rebaseOnboardingBranch } from "./rebase.js";
import { isNonEmptyObject, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/workers/repository/onboarding/branch/index.ts
async function checkOnboardingBranch(config) {
	logger.debug("checkOnboarding()");
	logger.trace({ config });
	const onboardingBranch = getInheritedOrGlobal("onboardingBranch");
	const defaultBranch = config.defaultBranch;
	let isConflicted = false;
	let isModified = false;
	const repoIsOnboarded = await isOnboarded(config);
	if (repoIsOnboarded) {
		logger.debug("Repo is onboarded");
		deleteOnboardingCache();
		return {
			...config,
			repoIsOnboarded
		};
	}
	checkIfConfigured(config);
	logger.debug("Repo is not onboarded");
	setGitAuthor(config.gitAuthor);
	const onboardingPr = await getOnboardingPr(config);
	const branchList = [onboardingBranch];
	if (onboardingPr) {
		logger.debug("Onboarding PR already exists");
		isModified = await isOnboardingBranchModified(onboardingBranch, defaultBranch);
		if (!isModified) {
			const commit = await rebaseOnboardingBranch(config, onboardingPr.bodyStruct?.rawConfigHash);
			if (commit) logger.info({
				branch: onboardingBranch,
				commit,
				onboarding: true
			}, "Branch updated");
			// istanbul ignore if
			if (platform.refreshPr) await platform.refreshPr(onboardingPr.number);
		}
		if (config.onboardingRebaseCheckbox) handleOnboardingManualRebase(onboardingPr);
		if (isConfigHashPresent(onboardingPr) && isOnboardingCacheValid(defaultBranch, onboardingBranch) && !(config.onboardingRebaseCheckbox && OnboardingState.prUpdateRequested)) {
			logger.debug("Skip processing since the onboarding branch is up to date and default branch has not changed");
			OnboardingState.onboardingCacheValid = true;
			return {
				...config,
				repoIsOnboarded,
				onboardingBranch,
				branchList
			};
		}
		OnboardingState.onboardingCacheValid = false;
		if (isModified) {
			if (hasOnboardingBranchChanged(onboardingBranch)) invalidateExtractCache(config.baseBranch);
			isConflicted = await isOnboardingBranchConflicted(config.baseBranch, onboardingBranch);
		}
	} else {
		logger.debug("Onboarding PR does not exist");
		const onboardingConfig = await getOnboardingConfig(config);
		let mergedConfig = mergeChildConfig(config, onboardingConfig);
		mergedConfig = await mergeRenovateConfig(mergedConfig);
		if (Object.entries((await extractAllDependencies(mergedConfig)).packageFiles).length === 0 && getInheritedOrGlobal("onboardingNoDeps") !== "enabled") throw new Error(REPOSITORY_NO_PACKAGE_FILES);
		logger.debug("Need to create onboarding PR");
		if (config.onboardingRebaseCheckbox) OnboardingState.prUpdateRequested = true;
		const commit = await createOnboardingBranch(mergedConfig);
		// istanbul ignore if
		if (commit) logger.info({
			branch: onboardingBranch,
			commit,
			onboarding: true
		}, "Branch created");
	}
	if (!GlobalConfig.get("dryRun") && !isConflicted) {
		logger.debug("Merge onboarding branch in default branch");
		await scm.mergeToLocal(onboardingBranch);
	}
	setOnboardingCache(getBranchCommit(config.defaultBranch), getBranchCommit(onboardingBranch), isConflicted, isModified);
	return {
		...config,
		repoIsOnboarded,
		onboardingBranch,
		branchList
	};
}
function handleOnboardingManualRebase(onboardingPr) {
	const pl = GlobalConfig.get("platform");
	const { rebaseRequested } = coerceObject(onboardingPr.bodyStruct);
	if (![
		"github",
		"gitlab",
		"gitea",
		"forgejo"
	].includes(pl)) {
		logger.trace(`Platform '${pl}' does not support extended markdown`);
		OnboardingState.prUpdateRequested = true;
	} else if (isNullOrUndefined(rebaseRequested)) {
		logger.debug("No rebase checkbox was found in the onboarding PR");
		OnboardingState.prUpdateRequested = true;
	} else if (rebaseRequested) {
		logger.debug("Manual onboarding PR update requested");
		OnboardingState.prUpdateRequested = true;
	}
}
function invalidateExtractCache(baseBranch) {
	const cache = getCache();
	cache.scan ??= {};
	if (cache.scan?.[baseBranch]) delete cache.scan[baseBranch];
}
function isOnboardingCacheValid(defaultBranch, onboardingBranch) {
	const onboardingBranchCache = getCache()?.onboardingBranchCache;
	return !!(isNonEmptyObject(onboardingBranchCache) && onboardingBranchCache.defaultBranchSha === getBranchCommit(defaultBranch) && onboardingBranchCache.onboardingBranchSha === getBranchCommit(onboardingBranch) && onboardingBranchCache.configFileName && onboardingBranchCache.configFileParsed);
}
function isConfigHashPresent(pr) {
	const platform = GlobalConfig.get("platform");
	if (![
		"github",
		"gitlab",
		"gitea",
		"forgejo"
	].includes(platform)) return true;
	return !!pr.bodyStruct?.rawConfigHash;
}
//#endregion
export { checkOnboardingBranch };

//# sourceMappingURL=index.js.map