import { MANAGER_LOCKFILE_ERROR, PLATFORM_AUTHENTICATION_ERROR, PLATFORM_BAD_CREDENTIALS, REPOSITORY_CHANGED, SYSTEM_INSUFFICIENT_DISK_SPACE } from "../../../../constants/error-messages.js";
import { GlobalConfig } from "../../../../config/global.js";
import { coerceArray } from "../../../../util/array.js";
import { logger, removeMeta } from "../../../../logger/index.js";
import { compile } from "../../../../util/template/index.js";
import { filterValidCommitTrailers } from "../../../../util/git/commit-trailers.js";
import { isScheduledNow } from "./schedule.js";
import { ExternalHostError } from "../../../../types/errors/external-host-error.js";
import { getCount, isLimitReached } from "../../../global/limits.js";
import { getElapsedMs } from "../../../../util/date.js";
import { emojify } from "../../../../util/emoji.js";
import { scm } from "../../../../modules/platform/scm.js";
import { platform } from "../../../../modules/platform/index.js";
import { ensureComment, ensureCommentRemoval } from "../../../../modules/platform/comment.js";
import { embedChangelogs } from "../../changelog/index.js";
import { getMergeConfidenceLevel, isActiveConfidenceLevel, satisfiesConfidenceLevel } from "../../../../util/merge-confidence/index.js";
import { setConfidence, setStability } from "./status-checks.js";
import { ensurePr, getPlatformPrOptions } from "../pr/index.js";
import { calculateMinimumReleaseAgeMs } from "../../../../util/minimum-release-age.js";
import { updateActionsLockfile } from "../../../../modules/manager/github-actions/artifacts.js";
import { getAdditionalFiles } from "../../../../modules/manager/npm/post-update/index.js";
import { checkAutoMerge } from "../pr/automerge.js";
import { setArtifactErrorStatus } from "./artifacts.js";
import { tryBranchAutomerge } from "./automerge.js";
import { bumpVersions } from "./bump-versions.js";
import { prAlreadyExisted } from "./check-existing.js";
import { commitFilesToBranch } from "./commit.js";
import executePostUpgradeCommands from "./execute-post-upgrade-commands.js";
import { getUpdatedPackageFiles } from "./get-updated.js";
import { handleClosedPr, handleModifiedPr } from "./handle-existing.js";
import { shouldReuseExistingBranch } from "./reuse.js";
import { isNonEmptyString } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/workers/repository/update/branch/index.ts
async function setBranchStatusChecks(config) {
	await setStability(config);
	await setConfidence(config);
}
async function rebaseCheck(config, branchPr) {
	if (branchPr.title?.startsWith("rebase!")) {
		logger.debug(`Manual rebase requested via PR title for #${branchPr.number}`);
		return true;
	}
	if (!!branchPr.labels?.includes(config.rebaseLabel)) {
		logger.debug(`Manual rebase requested via PR labels for #${branchPr.number}`);
		/* v8 ignore next -- needs test */
		if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would delete label ${config.rebaseLabel} from #${branchPr.number}`);
		else await platform.deleteLabel(branchPr.number, config.rebaseLabel);
		return true;
	}
	if (!!branchPr.bodyStruct?.rebaseRequested) {
		logger.debug(`Manual rebase requested via PR checkbox for #${branchPr.number}`);
		return true;
	}
	return false;
}
async function deleteBranchSilently(branchName) {
	try {
		await scm.deleteBranch(branchName);
	} catch (err) {
		/* v8 ignore next -- needs test */
		logger.debug({
			branchName,
			err
		}, "Branch auto-remove failed");
	}
}
function userChangedTargetBranch(pr) {
	const oldTargetBranch = pr.bodyStruct?.debugData?.targetBranch;
	if (oldTargetBranch && pr.targetBranch) return pr.targetBranch !== oldTargetBranch;
	return false;
}
async function processBranch(branchConfig, forceRebase = false) {
	let commitSha = null;
	let config = { ...branchConfig };
	logger.trace({ config }, "processBranch()");
	let branchExists = await scm.branchExists(config.branchName);
	const dependencyDashboardCheck = config.dependencyDashboardChecks?.[config.branchName];
	const unpendRequested = dependencyDashboardCheck === "unpend" || dependencyDashboardCheck === "global-config";
	let updatesVerified = false;
	if (!branchExists && config.branchPrefix !== config.branchPrefixOld) {
		const branchName = config.branchName.replace(config.branchPrefix, config.branchPrefixOld);
		branchExists = await scm.branchExists(branchName);
		// v8 ignore else -- TODO: add test #40625
		if (branchExists) {
			config.branchName = branchName;
			logger.debug("Found existing branch with branchPrefixOld");
		}
	}
	if (!branchExists && branchConfig.minimumGroupSize && branchConfig.minimumGroupSize > branchConfig.upgrades.length && !dependencyDashboardCheck) {
		logger.debug(`Skipping branch creation as minimumGroupSize: ${branchConfig.minimumGroupSize} is not met`);
		return {
			branchExists: false,
			result: "minimum-group-size-not-met"
		};
	}
	let branchPr = await platform.getBranchPr(config.branchName, config.baseBranch);
	logger.debug(`branchExists=${branchExists}`);
	logger.debug(`dependencyDashboardCheck=${dependencyDashboardCheck}`);
	if (branchPr) {
		config.rebaseRequested = await rebaseCheck(config, branchPr);
		logger.debug(`PR rebase requested=${config.rebaseRequested}`);
	}
	const keepUpdatedLabel = config.keepUpdatedLabel;
	const pendingRebaseTopic = emojify(":warning: Rebase not applied");
	const artifactErrorTopic = emojify(":warning: Artifact update problem");
	const artifactNoticeTopic = emojify(":information_source: Artifact update notice");
	try {
		const existingPr = !branchPr || config.automerge ? await prAlreadyExisted(config) : void 0;
		if (existingPr?.state === "merged") {
			logger.debug(`Matching PR #${existingPr.number} was merged previously`);
			if (config.automerge) {
				logger.debug("Disabling automerge because PR was merged previously");
				config.automerge = false;
				config.automergedPreviously = true;
			}
		} else if (!branchPr && existingPr && !dependencyDashboardCheck) {
			logger.debug({ prTitle: config.prTitle }, `Closed PR #${existingPr.number} already exists. Skipping branch.`);
			await handleClosedPr(config, existingPr);
			return {
				branchExists: false,
				prNo: existingPr.number,
				result: "already-existed"
			};
		}
		if (!branchExists && branchConfig.pendingChecks && !unpendRequested) {
			logger.debug(`Branch ${config.branchName} creation is disabled because internalChecksFilter was not met`);
			return {
				branchExists: false,
				result: "pending"
			};
		}
		if (!branchExists) {
			if (config.mode === "silent" && !dependencyDashboardCheck) {
				logger.debug(`Branch ${config.branchName} creation is disabled because mode=silent`);
				return {
					branchExists,
					result: "needs-approval"
				};
			}
			if (config.dependencyDashboardApproval && !dependencyDashboardCheck) {
				logger.debug(`Branch ${config.branchName} creation is disabled because dependencyDashboardApproval=true`);
				return {
					branchExists,
					result: "needs-approval"
				};
			}
		}
		logger.debug(`Open PR Count: ${getCount("ConcurrentPRs")}, Existing Branch Count: ${getCount("Branches")}, Hourly PR Count: ${getCount("HourlyPRs")}, Hourly Commit Count: ${getCount("HourlyCommits")}`);
		if (!branchExists && isLimitReached("Branches", branchConfig) && !dependencyDashboardCheck) {
			logger.debug("Reached branch limit - skipping branch creation");
			return {
				branchExists,
				result: "branch-limit-reached"
			};
		}
		if (!config.rebaseRequested && isLimitReached("Commits") && !dependencyDashboardCheck && !config.isVulnerabilityAlert) {
			logger.debug("Reached commits per run limit - skipping branch");
			return {
				branchExists,
				prNo: branchPr?.number,
				result: "commit-per-run-limit-reached"
			};
		}
		if (!config.rebaseRequested && isLimitReached("HourlyCommits", branchConfig) && !dependencyDashboardCheck && !config.isVulnerabilityAlert) {
			logger.debug("Reached hourly commits limit - skipping branch");
			return {
				branchExists,
				prNo: branchPr?.number,
				result: "commit-hourly-limit-reached"
			};
		}
		if (branchExists) {
			config.stopUpdating = branchPr?.labels?.includes(config.stopUpdatingLabel);
			const prRebaseChecked = !!branchPr?.bodyStruct?.rebaseRequested;
			if (!dependencyDashboardCheck && !prRebaseChecked && config.stopUpdating) {
				logger.info("Branch updating is skipped because stopUpdatingLabel is present in config");
				return {
					branchExists: true,
					prNo: branchPr?.number,
					result: "no-work"
				};
			}
			if (!unpendRequested && config.pendingChecks) {
				if (config.rebaseRequested) {
					logger.info("Branch updating is skipped because internalChecksFilter was not met, despite the requested rebase");
					if (branchPr) {
						const content = "This branch has not been rebased, as its update has not yet met the internal checks configured for it, such as `minimumReleaseAge`. Rebasing it now would add a dependency version which is still within its configured observation period.\n\nRenovate will rebase this branch once its update has met those checks.";
						if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would ensure pending rebase comment in PR #${branchPr.number}`);
						else await ensureComment({
							number: branchPr.number,
							topic: pendingRebaseTopic,
							content
						});
					}
				} else logger.info("Branch updating is skipped because internalChecksFilter was not met");
				return {
					branchExists: true,
					prNo: branchPr?.number,
					result: "pending"
				};
			}
			logger.debug("Checking if PR has been edited");
			const branchIsModified = await scm.isBranchModified(config.branchName, config.baseBranch);
			if (branchPr) {
				logger.debug(`Found existing branch PR #${branchPr.number}`);
				if (branchPr.state !== "open") {
					logger.debug("PR has been closed or merged since this run started - aborting");
					throw new Error(REPOSITORY_CHANGED);
				}
				if (branchIsModified || userChangedTargetBranch(branchPr)) {
					logger.debug(`PR has been edited, PrNo:${branchPr.number}`);
					await handleModifiedPr(config, branchPr);
					if (!(!!dependencyDashboardCheck || config.rebaseRequested)) return {
						branchExists,
						prNo: branchPr.number,
						result: "pr-edited"
					};
				}
			} else if (branchIsModified && !dependencyDashboardCheck) {
				const oldPr = await platform.findPr({
					branchName: config.branchName,
					state: "!open",
					targetBranch: config.baseBranch
				});
				if (!oldPr) {
					logger.debug("Branch has been edited but found no PR - skipping");
					return {
						branchExists,
						result: "pr-edited"
					};
				}
				const branchSha = await scm.getBranchCommit(config.branchName);
				const oldPrSha = oldPr?.sha;
				if (!oldPrSha || oldPrSha === branchSha) logger.debug({
					oldPrNumber: oldPr.number,
					oldPrSha,
					branchSha
				}, "Found old PR matching this branch - will override it");
				else {
					logger.debug({
						oldPrNumber: oldPr.number,
						oldPrSha,
						branchSha
					}, "Found old PR but the SHA is different");
					return {
						branchExists,
						result: "pr-edited"
					};
				}
			}
		}
		config.isScheduledNow = isScheduledNow(config, "schedule");
		if (!config.isScheduledNow && !dependencyDashboardCheck) {
			if (!branchExists) {
				logger.debug("Skipping branch creation as not within schedule");
				return {
					branchExists,
					result: "not-scheduled"
				};
			}
			if (config.updateNotScheduled === false && !config.rebaseRequested) {
				logger.debug("Skipping branch update as not within schedule");
				return {
					branchExists,
					prNo: branchPr?.number,
					result: "update-not-scheduled"
				};
			}
			if (!branchPr && !(config.automerge && config.automergeType === "branch")) {
				logger.debug("Skipping PR creation out of schedule");
				return {
					branchExists,
					result: "not-scheduled"
				};
			}
			logger.debug("Branch + PR exists but is not scheduled -- will update if necessary");
		}
		if (config.upgrades.some((upgrade) => isNonEmptyString(upgrade.minimumReleaseAge) || isActiveConfidenceLevel(upgrade.minimumConfidence))) {
			const depNamesWithoutReleaseTimestamp = {
				"timestamp-required": [],
				"timestamp-optional": []
			};
			config.stabilityStatus = "green";
			for (const upgrade of config.upgrades) {
				const minimumReleaseAgeMs = calculateMinimumReleaseAgeMs(upgrade);
				if (minimumReleaseAgeMs) {
					const minimumReleaseAgeBehaviour = upgrade.minimumReleaseAgeBehaviour ?? "timestamp-required";
					if (upgrade.releaseTimestamp) {
						const timeElapsed = getElapsedMs(upgrade.releaseTimestamp);
						if (timeElapsed < minimumReleaseAgeMs) {
							logger.debug({
								depName: upgrade.depName,
								timeElapsed,
								minimumReleaseAge: upgrade.minimumReleaseAge
							}, "Update has not passed minimum release age");
							config.stabilityStatus = "yellow";
							continue;
						}
					} else if (minimumReleaseAgeBehaviour === "timestamp-required") {
						depNamesWithoutReleaseTimestamp["timestamp-required"].push({
							depName: upgrade.depName,
							updateType: upgrade.updateType
						});
						config.stabilityStatus = "yellow";
						continue;
					} else depNamesWithoutReleaseTimestamp["timestamp-optional"].push({
						depName: upgrade.depName,
						updateType: upgrade.updateType
					});
				}
				const datasource = upgrade.datasource;
				const depName = upgrade.depName;
				const packageName = upgrade.packageName;
				const minimumConfidence = upgrade.minimumConfidence;
				const updateType = upgrade.updateType;
				const currentVersion = upgrade.currentVersion;
				const newVersion = upgrade.newVersion;
				if (isActiveConfidenceLevel(minimumConfidence)) {
					const confidence = await getMergeConfidenceLevel(datasource, packageName, currentVersion, newVersion, updateType) ?? "neutral";
					if (satisfiesConfidenceLevel(confidence, minimumConfidence)) config.confidenceStatus = "green";
					else {
						logger.debug({
							depName,
							confidence,
							minimumConfidence
						}, "Update does not meet minimum confidence scores");
						config.confidenceStatus = "yellow";
						continue;
					}
				}
			}
			if (depNamesWithoutReleaseTimestamp["timestamp-required"].length) logger.once.debug({ updates: depNamesWithoutReleaseTimestamp["timestamp-required"] }, `Marking ${depNamesWithoutReleaseTimestamp["timestamp-required"].length} release(s) as pending, as they do not have a releaseTimestamp and we're running with minimumReleaseAgeBehaviour=timestamp-required`);
			if (depNamesWithoutReleaseTimestamp["timestamp-optional"].length) {
				logger.once.warn("Some upgrade(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding. See debug logs for more information");
				logger.once.debug({ updates: depNamesWithoutReleaseTimestamp["timestamp-optional"] }, `${depNamesWithoutReleaseTimestamp["timestamp-optional"].length} upgrade(s) did not have a releaseTimestamp, but as we're running with minimumReleaseAgeBehaviour=timestamp-optional, proceeding`);
			}
			if (!dependencyDashboardCheck && !branchExists && config.stabilityStatus === "yellow" && ["not-pending", "status-success"].includes(config.prCreation)) {
				logger.debug("Skipping branch creation due to internal status checks not met");
				return {
					branchExists,
					result: "pending"
				};
			}
		}
		let userRebaseRequested = dependencyDashboardCheck === "rebase" || !!config.dependencyDashboardRebaseAllOpen || !!config.rebaseRequested;
		const userApproveAllPendingPR = !!config.dependencyDashboardAllPending;
		const userOpenAllRateLimtedPR = !!config.dependencyDashboardAllRateLimited;
		const userOpenAllSchedulePendingPR = !!config.dependencyDashboardAllAwaitingSchedule;
		if (forceRebase) {
			logger.debug("Force rebase because branch needs updating");
			config.reuseExistingBranch = false;
		} else if (userRebaseRequested) {
			logger.debug("User has requested rebase");
			config.reuseExistingBranch = false;
		} else if (dependencyDashboardCheck === "global-config") {
			logger.debug(`Manual create/rebase requested via checkedBranches`);
			config.reuseExistingBranch = false;
			userRebaseRequested = true;
		} else if (userApproveAllPendingPR) logger.debug("A user manually approved all pending PRs via the Dependency Dashboard.");
		else if (userOpenAllRateLimtedPR) logger.debug("A user manually approved all rate-limited PRs via the Dependency Dashboard.");
		else if (userOpenAllSchedulePendingPR) logger.debug("A user manually requested all awaiting schedule PRs via the Dependency Dashboard.");
		else if (branchExists && config.rebaseWhen === "never" && !(keepUpdatedLabel && branchPr?.labels?.includes(keepUpdatedLabel)) && !dependencyDashboardCheck) {
			logger.debug("rebaseWhen=never so skipping branch update check");
			return {
				branchExists,
				prNo: branchPr?.number,
				result: "no-work"
			};
		} else if (branchPr?.targetBranch && branchPr.targetBranch !== config.baseBranch) {
			logger.debug("Base branch changed by user, rebasing the branch onto new base");
			config.reuseExistingBranch = false;
		} else if (config.cacheFingerprintMatch === "no-match") {
			logger.debug("Cache fingerprint does not match, cannot reuse existing branch");
			config.reuseExistingBranch = false;
		} else config = await shouldReuseExistingBranch(config);
		logger.debug(`Using reuseExistingBranch: ${config.reuseExistingBranch}`);
		if (!(config.reuseExistingBranch && config.cacheFingerprintMatch === "matched")) {
			await scm.checkoutBranch(config.baseBranch);
			const res = await getUpdatedPackageFiles(config);
			if (res.artifactErrors && config.artifactErrors) res.artifactErrors = config.artifactErrors.concat(res.artifactErrors);
			config = {
				...config,
				...res
			};
			if (config.updatedPackageFiles?.length) {
				logger.debug(`Updated ${config.updatedPackageFiles.length} package files`);
				if (config.reuseExistingBranch && !forceRebase) {
					logger.debug("Existing branch needs updating. Restarting processBranch() with a clean branch");
					return processBranch(branchConfig, true);
				}
			} else logger.debug("No package files need updating");
			const additionalFiles = await getAdditionalFiles(config, branchConfig.packageFiles);
			config.artifactErrors = coerceArray(config.artifactErrors).concat(additionalFiles.artifactErrors);
			config.artifactNotices = coerceArray(config.artifactNotices).concat(coerceArray(additionalFiles.artifactNotices));
			config.updatedArtifacts = coerceArray(config.updatedArtifacts).concat(additionalFiles.updatedArtifacts);
			const actionsLockfile = await updateActionsLockfile(config, branchConfig.packageFiles);
			config.artifactErrors = config.artifactErrors.concat(actionsLockfile.artifactErrors);
			config.updatedArtifacts = config.updatedArtifacts.concat(actionsLockfile.updatedArtifacts);
			if (config.updatedArtifacts?.length) {
				logger.debug({ updatedArtifacts: config.updatedArtifacts.map((f) => f.type === "deletion" ? `${f.path} (delete)` : f.path) }, `Updated ${config.updatedArtifacts.length} lock files`);
				if (config.reuseExistingBranch && !forceRebase) {
					logger.debug("Existing branch needs updating. Restarting processBranch() with a clean branch");
					return processBranch(branchConfig, true);
				}
			} else logger.debug("No updated lock files in branch");
			await embedChangelogs({
				upgrades: config.upgrades,
				stage: "branch"
			});
			const postUpgradeCommandResults = await executePostUpgradeCommands(config);
			if (postUpgradeCommandResults !== null) {
				const { updatedArtifacts, artifactErrors } = postUpgradeCommandResults;
				config.updatedArtifacts = updatedArtifacts;
				config.artifactErrors = artifactErrors;
			}
			await bumpVersions(config);
			removeMeta(["dep"]);
			if (config.artifactErrors?.length) {
				if (config.releaseTimestamp) {
					logger.debug(`Branch timestamp: ${config.releaseTimestamp}`);
					if (DateTime.fromISO(config.releaseTimestamp).plus({ hours: 2 }) < DateTime.local()) logger.debug("PR is older than 2 hours, raise PR with lock file errors");
					else if (branchExists) logger.debug("PR is less than 2 hours old but branchExists so updating anyway");
					else {
						logger.debug("PR is less than 2 hours old - raise error instead of PR");
						throw new Error(MANAGER_LOCKFILE_ERROR);
					}
				} else logger.debug("PR has no releaseTimestamp");
			} else if (config.updatedArtifacts?.length && branchPr) {
				if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would ensure comment removal in PR #${branchPr.number}`);
				else {
					await ensureCommentRemoval({
						type: "by-topic",
						number: branchPr.number,
						topic: artifactErrorTopic
					});
					// v8 ignore else -- TODO: add test #40625
					if (!config.artifactNotices?.length) await ensureCommentRemoval({
						type: "by-topic",
						number: branchPr.number,
						topic: artifactNoticeTopic
					});
				}
			}
			const forcedManually = userRebaseRequested || !branchExists;
			config.isConflicted ??= branchExists && await scm.isBranchConflicted(config.baseBranch, config.branchName);
			config.forceCommit = forcedManually || config.isConflicted;
			if (config.commitBody) {
				config.commitMessage = `${config.commitMessage}\n\n${compile(config.commitBody, {
					...config,
					logJSON: config.upgrades[0].logJSON,
					releases: config.upgrades[0].releases
				})}`;
				logger.trace(`commitMessage: ${JSON.stringify(config.commitMessage)}`);
			}
			if (config.commitTrailers) {
				config.commitTrailers = filterValidCommitTrailers(config.commitTrailers.map((trailer) => compile(trailer, config)));
				logger.trace(`commitTrailers: ${JSON.stringify(config.commitTrailers)}`);
			}
			commitSha = await commitFilesToBranch(config);
			await scm.checkoutBranch(config.baseBranch);
			updatesVerified = true;
			if (commitSha) await setArtifactErrorStatus(config);
			if (commitSha && branchPr && config.rebaseRequested) {
				if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would ensure pending rebase comment removal in PR #${branchPr.number}`);
				else await ensureCommentRemoval({
					type: "by-topic",
					number: branchPr.number,
					topic: pendingRebaseTopic
				});
			}
		}
		if (branchPr) {
			const platformPrOptions = getPlatformPrOptions(config);
			if (commitSha && platformPrOptions.usePlatformAutomerge && platform.reattemptPlatformAutomerge) {
				if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would reattempt platform automerge for PR #${branchPr.number}`);
				else await platform.reattemptPlatformAutomerge({
					number: branchPr.number,
					platformPrOptions
				});
			}
			// v8 ignore else -- TODO: add test #40625
			if (platform.refreshPr) await platform.refreshPr(branchPr.number);
		}
		if (!commitSha && !branchExists) return {
			branchExists,
			result: "no-work"
		};
		if (commitSha) {
			const action = branchExists ? "updated" : "created";
			logger.info({ commitSha }, `Branch ${action}`);
		}
		await setBranchStatusChecks(config);
		if (!branchPr && !config.artifactErrors?.length && !userRebaseRequested && commitSha && config.prCreation !== "immediate") {
			logger.debug(`Branch status pending, current sha: ${commitSha}`);
			return {
				branchExists: true,
				updatesVerified,
				result: "pending",
				commitSha
			};
		}
		if (!config.artifactErrors?.length && (!commitSha || config.ignoreTests)) {
			const mergeStatus = await tryBranchAutomerge(config);
			logger.debug(`mergeStatus=${mergeStatus}`);
			if (mergeStatus === "automerged") {
				if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would delete branch${config.branchName}`);
				else await deleteBranchSilently(config.branchName);
				logger.debug("Branch is automerged - returning");
				return {
					branchExists: false,
					result: "automerged"
				};
			}
			if (mergeStatus === "off schedule") {
				if (userRebaseRequested) config.forcePr = true;
				else {
					logger.debug("Branch cannot automerge now because automergeSchedule is off schedule - skipping");
					return {
						branchExists,
						result: "not-scheduled",
						commitSha
					};
				}
			}
			if (mergeStatus === "stale" && ["conflicted", "never"].includes(config.rebaseWhen) && 
			/* v8 ignore next -- needs test */
			!(keepUpdatedLabel && branchPr?.labels?.includes(keepUpdatedLabel))) {
				logger.warn("Branch cannot automerge because it is behind base branch and rebaseWhen setting disallows rebasing - raising a PR instead");
				config.forcePr = true;
				config.branchAutomergeFailureMessage = mergeStatus;
			}
			if (mergeStatus === "automerge aborted - merge queue" || mergeStatus === "automerge aborted - PR exists" || mergeStatus === "branch status error" || mergeStatus === "failed") {
				logger.debug(`Branch automerge not possible, mergeStatus:${mergeStatus}`);
				config.forcePr = true;
				config.branchAutomergeFailureMessage = mergeStatus;
			}
		}
	} catch (err) {
		/* v8 ignore if -- needs test */
		if (err.statusCode === 404) {
			logger.debug({ err }, "Received a 404 error - aborting run");
			throw new Error(REPOSITORY_CHANGED);
		}
		/* v8 ignore if -- needs test */
		if (err.message === "rate-limit-exceeded") {
			logger.debug("Passing rate-limit-exceeded error up");
			throw err;
		}
		if (err.message === "repository-changed") {
			logger.debug("Passing repository-changed error up");
			throw err;
		}
		/* v8 ignore if -- needs test */
		if (err.message?.startsWith("remote: Invalid username or password")) {
			logger.debug("Throwing bad credentials");
			throw new Error(PLATFORM_BAD_CREDENTIALS);
		}
		/* v8 ignore if -- needs test */
		if (err.message?.startsWith("ssh_exchange_identification: Connection closed by remote host")) {
			logger.debug("Throwing bad credentials");
			throw new Error(PLATFORM_BAD_CREDENTIALS);
		}
		/* v8 ignore if -- needs test */
		if (err.message === "bad-credentials") {
			logger.debug("Passing bad-credentials error up");
			throw err;
		}
		/* v8 ignore if -- needs test */
		if (err.message === "integration-unauthorized") {
			logger.debug("Passing integration-unauthorized error up");
			throw err;
		}
		if (err.message === "lockfile-error") {
			logger.debug("Passing lockfile-error up");
			throw err;
		}
		if (err.message === "pr-already-in-merge-queue") {
			logger.debug("Branch PR is in the merge queue - skipping branch update");
			return {
				branchExists,
				prNo: branchPr?.number,
				result: "done",
				commitSha
			};
		}
		/* v8 ignore if -- needs test */
		if (err.message?.includes("space left on device")) throw new Error(SYSTEM_INSUFFICIENT_DISK_SPACE);
		/* v8 ignore if -- needs test */
		if (err.message === "disk-space") {
			logger.debug("Passing disk-space error up");
			throw err;
		}
		/* v8 ignore if -- needs test */
		if (err.message.startsWith("Resource not accessible by integration")) {
			logger.debug("Passing 403 error up");
			throw err;
		}
		/* v8 ignore next -- needs test */
		if (err.message === "update-failure") logger.warn("Error updating branch: update failure");
		else if (err.message.startsWith("bundler-")) return {
			branchExists: true,
			updatesVerified,
			prNo: branchPr?.number,
			result: "error",
			commitSha
		};
		else if (err.message?.includes("fatal: Authentication failed")) throw new Error(PLATFORM_AUTHENTICATION_ERROR);
		else if (err.message?.includes("fatal: bad revision")) {
			logger.debug({ err }, "Aborting job due to bad revision error");
			throw new Error(REPOSITORY_CHANGED);
		} else if (err.message === "config-validation") {
			logger.debug("Passing config validation error up");
			throw err;
		} else if (err.message === "temporary-error") {
			logger.debug("Passing TEMPORARY_ERROR error up");
			throw err;
		} else if (!(err instanceof ExternalHostError)) logger.warn({ err }, `Error updating branch`);
		return {
			branchExists,
			prNo: branchPr?.number,
			result: "error",
			commitSha
		};
	}
	try {
		logger.debug("Ensuring PR");
		logger.debug(`There are ${config.errors.length} errors and ${config.warnings.length} warnings`);
		const ensurePrResult = await ensurePr(config);
		if (ensurePrResult.type === "without-pr") {
			const { prBlockedBy } = ensurePrResult;
			branchPr = null;
			if (prBlockedBy === "RateLimited" && !config.isVulnerabilityAlert) {
				logger.debug("Reached PR limit - skipping PR creation");
				return {
					branchExists,
					prBlockedBy,
					result: "pr-limit-reached",
					commitSha
				};
			}
			if (prBlockedBy === "NeedsApproval") return {
				branchExists,
				prBlockedBy,
				result: "needs-pr-approval",
				commitSha
			};
			if (prBlockedBy === "AwaitingTests") return {
				branchExists,
				prBlockedBy,
				result: "pending",
				commitSha
			};
			if (prBlockedBy === "BranchAutomerge") return {
				branchExists,
				prBlockedBy,
				result: "done",
				commitSha
			};
			if (prBlockedBy === "Error") return {
				branchExists,
				prBlockedBy,
				result: "error",
				commitSha
			};
			logger.warn({ prBlockedBy }, "Unknown PrBlockedBy result");
			return {
				branchExists,
				prBlockedBy,
				result: "error",
				commitSha
			};
		}
		// v8 ignore else -- TODO: add test #40625
		if (ensurePrResult.type === "with-pr") {
			const { pr } = ensurePrResult;
			branchPr = pr;
			await setBranchStatusChecks(config);
			if (commitSha) await setArtifactErrorStatus(config);
			if (config.artifactErrors?.length) {
				logger.warn({ artifactErrors: config.artifactErrors }, "artifactErrors");
				let content = `Renovate failed to update `;
				content += config.artifactErrors.length > 1 ? "artifacts" : "an artifact";
				content += " related to this branch. ";
				content += compile(config.userStrings.artifactErrorWarning, config);
				content += emojify(`\n\n:recycle: Renovate will retry this branch, including artifacts, only when one of the following happens:\n\n`);
				content += " - any of the package files in this branch needs updating, or \n";
				content += " - the branch becomes conflicted, or\n";
				content += " - you click the rebase/retry checkbox if found above, or\n";
				content += " - you rename this PR's title to start with \"rebase!\" to trigger it manually";
				content += "\n\nThe artifact failure details are included below:\n\n";
				config.artifactErrors.forEach((error) => {
					content += `##### File name: ${error.fileName}\n\n`;
					content += `\`\`\`\n${error.stderr}\n\`\`\`\n\n`;
				});
				content = platform.massageMarkdown(content, config.rebaseLabel);
				// v8 ignore else -- TODO: add test #40625
				if (!(config.suppressNotifications.includes("artifactErrors") || config.suppressNotifications.includes("lockFileErrors"))) {
					if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would ensure lock file error comment in PR #${pr.number}`);
					else await ensureComment({
						number: pr.number,
						topic: artifactErrorTopic,
						content
					});
				}
			} else {
				if (config.artifactNotices?.length) {
					const contentLines = [];
					for (const notice of config.artifactNotices) {
						contentLines.push(`##### File name: ${notice.file}`);
						contentLines.push(notice.message);
					}
					const content = contentLines.join("\n\n");
					await ensureComment({
						number: pr.number,
						topic: artifactNoticeTopic,
						content
					});
				}
				if (config.automerge) {
					logger.debug("PR is configured for automerge");
					// v8 ignore else -- TODO: add test #40625
					if (config.ignoreTests === true || !commitSha) {
						logger.debug("checking auto-merge");
						if ((await checkAutoMerge(pr, config))?.automerged) return {
							branchExists,
							result: "automerged",
							commitSha
						};
					}
				} else logger.debug("PR is not configured for automerge");
			}
		}
	} catch (err) {
		/* v8 ignore if -- needs test */
		if (err instanceof ExternalHostError || ["rate-limit-exceeded", "repository-changed"].includes(err.message)) {
			logger.debug("Passing PR error up");
			throw err;
		}
		logger.error({ err }, `Error ensuring PR`);
	}
	if (!branchExists) return {
		branchExists: true,
		updatesVerified,
		prNo: branchPr?.number,
		result: "pr-created",
		commitSha
	};
	return {
		branchExists,
		updatesVerified,
		prNo: branchPr?.number,
		result: "done",
		commitSha
	};
}
//#endregion
export { processBranch };

//# sourceMappingURL=index.js.map