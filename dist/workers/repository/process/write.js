import { addMeta, logger, removeMeta } from "../../../logger/index.js";
import { instrument } from "../../../instrumentation/index.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { incCountValue, setCount } from "../../global/limits.js";
import { scm } from "../../../modules/platform/scm.js";
import { hashMap } from "../../../modules/manager/fingerprint.generated.js";
import "../../../modules/manager/index.js";
import { fingerprint } from "../../../util/fingerprint.js";
import { setBranchNewCommit } from "../../../util/git/set-branch-commit.js";
import { processBranch } from "../update/branch/index.js";
import { upgradeFingerprintFields } from "./fingerprint-fields.js";
import { getCommitsHourlyCount, getConcurrentBranchesCount, getConcurrentPrsCount, getPrHourlyCount } from "./limits.js";
import { isString } from "@sindresorhus/is";
import { ATTR_VCS_REF_BASE_TYPE, ATTR_VCS_REF_HEAD_NAME, ATTR_VCS_REF_TYPE } from "@opentelemetry/semantic-conventions/incubating";
//#region lib/workers/repository/process/write.ts
function generateCommitFingerprintConfig(branch) {
	return branch.upgrades.map((upgrade) => {
		const filteredUpgrade = {};
		for (const field of upgradeFingerprintFields) filteredUpgrade[field] = upgrade[field];
		if (upgrade.postUpgradeTasks) filteredUpgrade.postUpgradeTasks = {
			commands: upgrade.postUpgradeTasks.commands,
			fileFilters: upgrade.postUpgradeTasks.fileFilters
		};
		return filteredUpgrade;
	});
}
function compareCacheFingerprint(branchState, commitFingerprint) {
	if (!branchState.commitFingerprint) {
		logger.trace("branch.isUpToDate(): no fingerprint");
		return "no-fingerprint";
	}
	if (commitFingerprint !== branchState.commitFingerprint) {
		logger.debug("branch.isUpToDate(): needs recalculation");
		return "no-match";
	}
	logger.debug("branch.isUpToDate(): using cached result \"true\"");
	return "matched";
}
async function syncBranchState(branchName, baseBranch) {
	logger.debug("syncBranchState()");
	const branchSha = await scm.getBranchCommit(branchName);
	const baseBranchSha = await scm.getBranchCommit(baseBranch);
	const cache = getCache();
	cache.branches ??= [];
	const { branches: cachedBranches } = cache;
	let branchState = cachedBranches.find((br) => br.branchName === branchName);
	if (!branchState) {
		logger.debug("syncBranchState(): Branch cache not found, creating minimal branchState");
		branchState = {
			branchName,
			sha: branchSha,
			baseBranch,
			baseBranchSha
		};
		cachedBranches.push(branchState);
	}
	if (baseBranch !== branchState.baseBranch) {
		logger.debug("syncBranchState(): update baseBranch name");
		branchState.baseBranch = baseBranch;
		delete branchState.isModified;
		branchState.pristine = false;
	}
	if (baseBranchSha !== branchState.baseBranchSha) {
		logger.debug("syncBranchState(): update baseBranchSha");
		delete branchState.isBehindBase;
		delete branchState.isConflicted;
		branchState.baseBranchSha = baseBranchSha;
		branchState.pristine = false;
	}
	if (branchSha !== branchState.sha) {
		logger.debug("syncBranchState(): update branchSha");
		delete branchState.isBehindBase;
		delete branchState.isConflicted;
		delete branchState.isModified;
		delete branchState.commitFingerprint;
		const commitDate = await scm.getBranchUpdateDate(branchName);
		if (commitDate) branchState.commitTimestamp = commitDate.toISO();
		branchState.sha = branchSha;
		branchState.pristine = false;
	}
	return branchState;
}
async function writeUpdates(config, allBranches) {
	const branches = allBranches;
	logger.debug(`Processing ${branches.length} branch${branches.length === 1 ? "" : "es"}: ${branches.map((b) => b.branchName).sort().join(", ")}`);
	const vulnerabilityBranches = branches.filter((b) => b.isVulnerabilityAlert);
	const otherBranches = branches.filter((b) => !b.isVulnerabilityAlert);
	setCount("ConcurrentPRs", await getConcurrentPrsCount(config, otherBranches));
	setCount("VulnerabilityConcurrentPRs", await getConcurrentPrsCount(config, vulnerabilityBranches));
	setCount("Branches", await getConcurrentBranchesCount(otherBranches));
	setCount("VulnerabilityBranches", await getConcurrentBranchesCount(vulnerabilityBranches));
	const prsThisHourCount = await getPrHourlyCount(config);
	setCount("HourlyPRs", prsThisHourCount);
	const commitsThisHourCount = await getCommitsHourlyCount(branches);
	setCount("HourlyCommits", commitsThisHourCount);
	for (const branch of branches) {
		const { baseBranch, branchName } = branch;
		const res = await instrument(branchName, async () => {
			const meta = { branch: branchName };
			if (config.baseBranchPatterns?.length && baseBranch) meta.baseBranch = baseBranch;
			addMeta(meta);
			const branchExisted = await scm.branchExists(branchName);
			const branchState = await syncBranchState(branchName, baseBranch);
			const managers = [...new Set(branch.upgrades.map((upgrade) => hashMap.get(upgrade.manager) ?? upgrade.manager).filter(isString))].sort();
			const commitFingerprint = fingerprint({
				commitFingerprintConfig: generateCommitFingerprintConfig(branch),
				managers
			});
			branch.cacheFingerprintMatch = compareCacheFingerprint(branchState, commitFingerprint);
			const res = await processBranch(branch);
			branch.prBlockedBy = res?.prBlockedBy;
			branch.prNo = res?.prNo;
			branch.result = res?.result;
			branch.commitFingerprint = res?.updatesVerified ? commitFingerprint : branchState.commitFingerprint;
			if (res?.commitSha) {
				const commitDate = await scm.getBranchUpdateDate(branchName);
				setBranchNewCommit(branchName, baseBranch, res.commitSha, commitDate);
			}
			if (branch.result === "automerged" && branch.automergeType !== "pr-comment") return "automerged";
			if (!branchExisted && await scm.branchExists(branch.branchName)) incCountValue(branch.isVulnerabilityAlert ? "VulnerabilityBranches" : "Branches");
		}, { attributes: {
			[ATTR_VCS_REF_TYPE]: "branch",
			[ATTR_VCS_REF_BASE_TYPE]: "branch",
			[ATTR_VCS_REF_HEAD_NAME]: branchName
		} });
		if (res !== void 0) return res;
	}
	removeMeta(["branch", "baseBranch"]);
	return "done";
}
//#endregion
export { compareCacheFingerprint, generateCommitFingerprintConfig, syncBranchState, writeUpdates };

//# sourceMappingURL=write.js.map