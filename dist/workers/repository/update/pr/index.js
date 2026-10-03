import "../../../../constants/error-messages.js";
import { pkg } from "../../../../expose.js";
import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { ExternalHostError } from "../../../../types/errors/external-host-error.js";
import { incCountValue, isLimitReached } from "../../../global/limits.js";
import { getBranchLastCommitTime } from "../../../../util/git/index.js";
import { getElapsedHours } from "../../../../util/date.js";
import { emojify, stripEmojis } from "../../../../util/emoji.js";
import { getPrBodyStruct, hashBody } from "../../../../modules/platform/pr-body.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { getPrCache, setPrCache } from "./pr-cache.js";
import { ensureComment } from "../../../../modules/platform/comment.js";
import { fingerprint } from "../../../../util/fingerprint.js";
import { memoize } from "../../../../util/memoize.js";
import { embedChangelogs } from "../../changelog/index.js";
import { resolveBranchStatus } from "../branch/status-checks.js";
import { getPrBody } from "./body/index.js";
import { getChangedLabels, prepareLabels, shouldUpdateLabels } from "./labels.js";
import { addParticipants } from "./participants.js";
import { generatePrBodyFingerprintConfig, validatePrCache } from "./pr-fingerprint.js";
import { tryReuseAutoclosedPr } from "./pr-reuse.js";
import { isArray, isNonEmptyArray, isNumber, isUndefined } from "@sindresorhus/is";
import { codeBlock } from "common-tags";
//#region lib/workers/repository/update/pr/index.ts
function getPlatformPrOptions(config) {
	const usePlatformAutomerge = Boolean(config.automerge && (config.automergeType === "pr" || config.automergeType === "branch") && config.platformAutomerge);
	return {
		autoApprove: !!config.autoApprove,
		automergeCommitMessage: config.commitMessage,
		automergeStrategy: config.automergeStrategy,
		azureWorkItemId: config.azureWorkItemId ?? 0,
		bbAutoResolvePrTasks: !!config.bbAutoResolvePrTasks,
		bbUseDefaultReviewers: !!config.bbUseDefaultReviewers,
		gitLabIgnoreApprovals: !!config.gitLabIgnoreApprovals,
		forkModeDisallowMaintainerEdits: !!config.forkModeDisallowMaintainerEdits,
		usePlatformAutomerge
	};
}
function updatePrDebugData(targetBranch, labels, debugData) {
	const updatedPrDebugData = {
		createdInVer: debugData?.createdInVer ?? pkg.version,
		updatedInVer: pkg.version,
		targetBranch
	};
	if (!debugData || isArray(debugData.labels)) updatedPrDebugData.labels = labels;
	return updatedPrDebugData;
}
function hasNotIgnoredReviewers(pr, config) {
	if (isNonEmptyArray(config.ignoreReviewers) && isNonEmptyArray(pr.reviewers)) {
		const ignoreReviewers = new Set(config.ignoreReviewers);
		return pr.reviewers.filter((reviewer) => !ignoreReviewers.has(reviewer)).length > 0;
	}
	return isNonEmptyArray(pr.reviewers);
}
function addPullRequestNoteIfAttestationHasBeenLost(upgrade, currentReleaseHasAttestation) {
	const { packageName, depName, currentVersion, newVersion } = upgrade;
	const name = packageName ?? depName;
	const newRelease = upgrade.releases?.find((release) => release.version === newVersion);
	if (newRelease && currentReleaseHasAttestation === true && newRelease.attestation !== true) {
		upgrade.prBodyNotes ??= [];
		upgrade.prBodyNotes.push(emojify(codeBlock`
          > :stop_sign: **Caution**
          >
          > ${name} ${currentVersion} was released with an attestation, but ${newVersion} has no attestation.
          > Verify that release ${newVersion} was published by the expected author.
        `));
	}
}
async function ensurePr(prConfig) {
	const config = { ...prConfig };
	const filteredPrConfig = generatePrBodyFingerprintConfig(config);
	const prBodyFingerprint = fingerprint(filteredPrConfig);
	logger.trace({ config }, "ensurePr");
	const { branchName, ignoreTests, internalChecksAsSuccess, prTitle = "", upgrades, hasAttestation: currentReleaseHasAttestation } = config;
	const getBranchStatus = memoize(() => resolveBranchStatus(branchName, !!internalChecksAsSuccess, ignoreTests));
	const dependencyDashboardCheck = config.dependencyDashboardChecks?.[config.branchName];
	const dependencyDashboardApproved = dependencyDashboardCheck === "approvePr" || dependencyDashboardCheck === "unpend";
	const existingPr = await platform.getBranchPr(branchName, config.baseBranch) ?? await tryReuseAutoclosedPr(branchName, prTitle);
	const prCache = getPrCache(branchName);
	if (existingPr) {
		logger.debug("Found existing PR");
		if (existingPr.bodyStruct?.rebaseRequested) logger.debug("PR rebase requested, so skipping cache check");
		else if (prCache) {
			logger.trace({ prCache }, "Found existing PR cache");
			if (validatePrCache(prCache, prBodyFingerprint) && !config.autoApprove) return {
				type: "with-pr",
				pr: existingPr
			};
		} else if (config.repositoryCache === "enabled") logger.debug("PR cache not found");
	}
	config.upgrades = [];
	if (config.artifactErrors?.length) {
		logger.debug("Forcing PR because of artifact errors");
		config.forcePr = true;
	}
	if (dependencyDashboardApproved) {
		logger.debug("Forcing PR because of dependency dashboard approval");
		config.forcePr = true;
	}
	if (!existingPr) {
		if (config.automerge === true && config.automergeType?.startsWith("branch") && !config.forcePr) {
			logger.debug(`Branch automerge is enabled`);
			if (config.stabilityStatus !== "yellow" && await getBranchStatus() === "yellow" && isNumber(config.prNotPendingHours)) {
				logger.debug("Checking how long this branch has been pending");
				const lastCommitTime = await getBranchLastCommitTime(branchName);
				if (getElapsedHours(lastCommitTime) >= config.prNotPendingHours) {
					logger.debug(`Branch exceeds prNotPending=${config.prNotPendingHours}, hours - forcing PR creation`);
					config.forcePr = true;
				}
			}
			if (config.forcePr || await getBranchStatus() === "red") logger.debug(`Branch tests failed, so will create PR`);
			else return {
				type: "without-pr",
				prBlockedBy: "BranchAutomerge"
			};
		}
		if (config.prCreation === "status-success") {
			logger.debug("Checking branch combined status");
			if (await getBranchStatus() !== "green") {
				logger.debug(`Branch status isn't green - not creating PR`);
				return {
					type: "without-pr",
					prBlockedBy: "AwaitingTests"
				};
			}
			logger.debug("Branch status success");
		} else if (config.prCreation === "approval" && !dependencyDashboardApproved) return {
			type: "without-pr",
			prBlockedBy: "NeedsApproval"
		};
		else if (config.prCreation === "not-pending" && !config.forcePr) {
			logger.debug("Checking branch combined status");
			if (await getBranchStatus() === "yellow") {
				logger.debug(`Branch status is yellow - checking timeout`);
				const lastCommitTime = await getBranchLastCommitTime(branchName);
				const elapsedHours = getElapsedHours(lastCommitTime);
				if (!dependencyDashboardCheck && (config.stabilityStatus && config.stabilityStatus !== "yellow" || isNumber(config.prNotPendingHours) && elapsedHours < config.prNotPendingHours)) {
					logger.debug(`Branch is ${elapsedHours} hours old - skipping PR creation as prNotPendingHours is set to ${config.prNotPendingHours}`);
					return {
						type: "without-pr",
						prBlockedBy: "AwaitingTests"
					};
				}
				const prNotPendingHours = String(config.prNotPendingHours);
				logger.debug(`prNotPendingHours=${prNotPendingHours} threshold hit - creating PR`);
			}
			logger.debug("Branch status success");
		}
	}
	const processedUpgrades = [];
	const commitRepos = [];
	function getRepoNameWithSourceDirectory(upgrade) {
		return `${upgrade.repoName}${upgrade.sourceDirectory ? `:${upgrade.sourceDirectory}` : ""}`;
	}
	await embedChangelogs({
		upgrades,
		stage: "pr"
	});
	for (const upgrade of upgrades) {
		const upgradeKey = `${upgrade.depType}-${upgrade.depName}-${upgrade.manager}-${upgrade.currentVersion ?? ""}-${upgrade.currentValue ?? ""}-${upgrade.newVersion ?? ""}-${upgrade.newValue ?? ""}`;
		if (processedUpgrades.includes(upgradeKey)) continue;
		processedUpgrades.push(upgradeKey);
		const logJSON = upgrade.logJSON;
		if (logJSON) {
			if (isUndefined(logJSON.error)) {
				if (logJSON.project) upgrade.repoName = logJSON.project.repository;
				upgrade.hasReleaseNotes = false;
				upgrade.releases = [];
				if (logJSON.hasReleaseNotes && upgrade.repoName && !commitRepos.includes(getRepoNameWithSourceDirectory(upgrade))) {
					commitRepos.push(getRepoNameWithSourceDirectory(upgrade));
					upgrade.hasReleaseNotes = logJSON.hasReleaseNotes;
					if (logJSON.versions) for (const version of logJSON.versions) {
						const release = { ...version };
						upgrade.releases.push(release);
					}
				}
			} else if (logJSON.error === "MissingGithubToken") {
				upgrade.prBodyNotes ??= [];
				upgrade.prBodyNotes.push(emojify(codeBlock`
              > :exclamation: **Important**
              >
              > Release Notes retrieval for this PR were skipped because no github.com credentials were available.
              > If you are self-hosted, please see [this instruction](https://github.com/renovatebot/renovate/blob/master/docs/usage/examples/self-hosting.md#githubcom-token-for-release-notes).
            `));
			}
		}
		addPullRequestNoteIfAttestationHasBeenLost(upgrade, currentReleaseHasAttestation);
		config.upgrades.push(upgrade);
	}
	config.hasReleaseNotes = config.upgrades.some((upg) => upg.hasReleaseNotes);
	const releaseNotesSources = [];
	for (const upgrade of config.upgrades) {
		let notesSourceUrl = upgrade.releases?.[0]?.releaseNotes?.notesSourceUrl;
		notesSourceUrl ??= `${upgrade.sourceUrl}${upgrade.sourceDirectory ? `:${upgrade.sourceDirectory}` : ""}`;
		if (upgrade.hasReleaseNotes && notesSourceUrl) {
			if (releaseNotesSources.includes(notesSourceUrl)) {
				logger.debug({ depName: upgrade.depName }, "Removing duplicate release notes");
				upgrade.hasReleaseNotes = false;
			} else releaseNotesSources.push(notesSourceUrl);
		}
	}
	const prBody = getPrBody(config, { debugData: updatePrDebugData(config.baseBranch, prepareLabels(config), existingPr?.bodyStruct?.debugData) }, config);
	try {
		if (existingPr) {
			logger.debug("Processing existing PR");
			if (!existingPr.hasAssignees && !hasNotIgnoredReviewers(existingPr, config) && config.automerge && !config.assignAutomerge && await getBranchStatus() === "red") {
				logger.debug(`Setting assignees and reviewers as status checks failed`);
				await addParticipants(config, existingPr);
			}
			const existingPrTitle = stripEmojis(existingPr.title);
			const existingPrBodyHash = existingPr.bodyStruct?.hash;
			const newPrTitle = stripEmojis(prTitle);
			const newPrBodyHash = hashBody(prBody);
			const prInitialLabels = existingPr.bodyStruct?.debugData?.labels;
			const prCurrentLabels = existingPr.labels;
			const configuredLabels = prepareLabels(config);
			const labelsNeedUpdate = shouldUpdateLabels(prInitialLabels, prCurrentLabels, configuredLabels);
			if (existingPr?.targetBranch === config.baseBranch && existingPrTitle === newPrTitle && existingPrBodyHash === newPrBodyHash && !labelsNeedUpdate && !config.autoApprove) {
				setPrCache(branchName, prBodyFingerprint, false);
				logger.debug(`Pull Request #${existingPr.number} does not need updating`);
				return {
					type: "with-pr",
					pr: existingPr
				};
			}
			const updatePrConfig = {
				number: existingPr.number,
				prTitle,
				prBody,
				platformPrOptions: getPlatformPrOptions(config)
			};
			if (existingPr?.targetBranch !== config.baseBranch) {
				logger.debug({
					branchName,
					oldBaseBranch: existingPr?.targetBranch,
					newBaseBranch: config.baseBranch
				}, "PR base branch has changed");
				updatePrConfig.targetBranch = config.baseBranch;
			}
			if (labelsNeedUpdate) {
				logger.debug({
					branchName,
					prCurrentLabels,
					configuredLabels
				}, "PR labels have changed");
				const [addLabels, removeLabels] = getChangedLabels(prCurrentLabels, configuredLabels);
				updatePrConfig.labels = configuredLabels;
				updatePrConfig.addLabels = addLabels;
				updatePrConfig.removeLabels = removeLabels;
			}
			if (existingPrTitle !== newPrTitle) logger.debug({
				branchName,
				oldPrTitle: existingPr.title,
				newPrTitle: prTitle
			}, "PR title changed");
			else if (config.autoApprove) logger.debug({ prTitle }, "PR approval required");
			else if (!config.committedFiles && !config.rebaseRequested) logger.debug({ prTitle }, "PR body changed");
			if (GlobalConfig.get("dryRun")) {
				logger.info(`DRY-RUN: Would update PR #${existingPr.number}`);
				return {
					type: "with-pr",
					pr: existingPr
				};
			}
			await platform.updatePr(updatePrConfig);
			logger.info({
				pr: existingPr.number,
				prTitle
			}, `PR updated`);
			setPrCache(branchName, prBodyFingerprint, true);
			return {
				type: "with-pr",
				pr: {
					...existingPr,
					bodyStruct: getPrBodyStruct(prBody),
					title: prTitle,
					targetBranch: config.baseBranch
				}
			};
		}
		logger.debug({
			branch: branchName,
			prTitle
		}, `Creating PR`);
		if (config.updateType === "rollback") logger.info("Creating Rollback PR");
		let pr;
		if (GlobalConfig.get("dryRun")) {
			logger.info({ labels: prepareLabels(config) }, `DRY-RUN: Would create PR: ${prTitle}`);
			pr = { number: 0 };
		} else try {
			if (!dependencyDashboardCheck && isLimitReached("ConcurrentPRs", prConfig)) {
				logger.debug("Skipping PR - limit reached");
				return {
					type: "without-pr",
					prBlockedBy: "RateLimited"
				};
			}
			pr = await platform.createPr({
				sourceBranch: branchName,
				targetBranch: config.baseBranch,
				prTitle,
				prBody,
				labels: prepareLabels(config),
				platformPrOptions: getPlatformPrOptions(config),
				draftPR: !!config.draftPR,
				milestone: config.milestone
			});
			incCountValue(config.isVulnerabilityAlert ? "VulnerabilityConcurrentPRs" : "ConcurrentPRs");
			incCountValue("HourlyPRs");
			logger.info({
				pr: pr?.number,
				prTitle,
				labels: pr?.labels
			}, "PR created");
		} catch (err) {
			logger.debug({ err }, "Pull request creation error");
			if (err.body?.message === "Validation failed" && err.body.errors?.length && err.body.errors.some((error) => error.message?.startsWith("A pull request already exists"))) {
				logger.warn("A pull requests already exists");
				return {
					type: "without-pr",
					prBlockedBy: "Error"
				};
			}
			if (err.statusCode === 502) {
				logger.warn({ branch: branchName }, "Deleting branch due to server error");
				await scm.deleteBranch(branchName);
			}
			return {
				type: "without-pr",
				prBlockedBy: "Error"
			};
		}
		if (pr && config.branchAutomergeFailureMessage && !config.suppressNotifications?.includes("branchAutomergeFailure")) {
			const topic = "Branch automerge failure";
			let content = "This PR was configured for branch automerge. However, this is not possible, so it has been raised as a PR instead.";
			if (config.branchAutomergeFailureMessage === "branch status error") content += "\n___\n * Branch has one or more failed status checks";
			if (config.branchAutomergeFailureMessage === "automerge aborted - merge queue") content += "\n___\n * The base branch only accepts changes through its merge queue and rejected the direct push, so branch automerge is not possible. Please set `automergeType=pr` instead, or allow Renovate to bypass the merge queue.";
			content = platform.massageMarkdown(content, config.rebaseLabel);
			logger.debug("Adding branch automerge failure message to PR");
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would add comment to PR #${pr.number}`);
			else await ensureComment({
				number: pr.number,
				topic,
				content
			});
		}
		if (pr) {
			if (config.automerge && !config.assignAutomerge && await getBranchStatus() !== "red") logger.debug(`Skipping assignees and reviewers as automerge=${config.automerge}`);
			else await addParticipants(config, pr);
			setPrCache(branchName, prBodyFingerprint, true);
			logger.debug(`Created Pull Request #${pr.number}`);
			return {
				type: "with-pr",
				pr
			};
		}
	} catch (err) {
		if (err instanceof ExternalHostError || err.message === "repository-changed" || err.message === "rate-limit-exceeded" || err.message === "integration-unauthorized") {
			logger.debug("Passing error up");
			throw err;
		}
		logger.warn({
			err,
			prTitle
		}, "Failed to ensure PR");
	}
	if (existingPr) return {
		type: "with-pr",
		pr: existingPr
	};
	return {
		type: "without-pr",
		prBlockedBy: "Error"
	};
}
//#endregion
export { ensurePr, getPlatformPrOptions, updatePrDebugData };

//# sourceMappingURL=index.js.map