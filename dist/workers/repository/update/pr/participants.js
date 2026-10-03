import { GlobalConfig } from "../../../../config/global.js";
import { coerceArray } from "../../../../util/array.js";
import { logger } from "../../../../logger/index.js";
import { noLeadingAtSymbol } from "../../../../util/common.js";
import { sampleSize } from "../../../../util/sample.js";
import { platform } from "../../../../modules/platform/index.js";
import { codeOwnersForPr } from "./code-owners.js";
import { isArray, isNonEmptyString, isNumber } from "@sindresorhus/is";
//#region lib/workers/repository/update/pr/participants.ts
async function addCodeOwners(config, assigneesOrReviewers, pr) {
	const codeOwners = await codeOwnersForPr(pr);
	const assignees = config.expandCodeOwnersGroups && platform.expandGroupMembers ? await platform.expandGroupMembers(codeOwners) : codeOwners;
	return [...new Set(assigneesOrReviewers.concat(assignees))];
}
function filterUnavailableUsers(config, users) {
	return config.filterUnavailableUsers && platform.filterUnavailableUsers ? platform.filterUnavailableUsers(users) : Promise.resolve(users);
}
function prepareParticipants(config, usernames) {
	return filterUnavailableUsers(config, [...new Set(usernames.map(noLeadingAtSymbol).filter(isNonEmptyString))]);
}
async function addParticipants(config, pr) {
	let assignees = coerceArray(config.assignees);
	logger.debug(`addParticipants(pr=${pr?.number})`);
	if (config.assigneesFromCodeOwners) assignees = await addCodeOwners(config, assignees, pr);
	if (assignees.length > 0) try {
		assignees = await prepareParticipants(config, assignees);
		if (isNumber(config.assigneesSampleSize)) assignees = sampleSize(assignees, config.assigneesSampleSize);
		if (assignees.length > 0) {
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would add assignees to PR #${pr.number}`);
			else {
				await platform.addAssignees(pr.number, assignees);
				logger.debug({ assignees }, "Added assignees");
			}
		}
	} catch (err) {
		logger.debug({
			assignees: config.assignees,
			err
		}, "Failed to add assignees");
	}
	let reviewers = coerceArray(config.reviewers);
	if (config.reviewersFromCodeOwners) {
		reviewers = await addCodeOwners(config, reviewers, pr);
		logger.debug(`Reviewers from code owners: ${reviewers.map((reviewer) => `"${reviewer}"`).join(", ")}`);
	}
	if (isArray(config.additionalReviewers) && config.additionalReviewers.length > 0) {
		logger.debug(`Additional reviewers: ${config.additionalReviewers.map((reviewer) => `"${reviewer}"`).join(", ")}`);
		reviewers = reviewers.concat(config.additionalReviewers);
	}
	if (reviewers.length > 0) try {
		reviewers = await prepareParticipants(config, reviewers);
		if (isNumber(config.reviewersSampleSize)) {
			logger.debug(`Sampling reviewersSampleSize=${config.reviewersSampleSize} reviewers`);
			reviewers = sampleSize(reviewers, config.reviewersSampleSize);
		}
		if (reviewers.length > 0) {
			if (GlobalConfig.get("dryRun")) logger.info(`DRY-RUN: Would add reviewers to PR #${pr.number}`);
			else {
				await platform.addReviewers(pr.number, reviewers);
				logger.debug({ reviewers }, "Added reviewers");
			}
		}
	} catch (err) {
		logger.debug({
			reviewers: config.reviewers,
			err
		}, "Failed to add reviewers");
	}
}
//#endregion
export { addParticipants };

//# sourceMappingURL=participants.js.map