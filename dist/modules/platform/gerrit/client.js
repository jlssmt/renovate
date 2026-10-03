import { REPOSITORY_ARCHIVED } from "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { getQueryString } from "../../../util/url.js";
import { GerritHttp } from "../../../util/http/gerrit.js";
import { GerritBranchInfo, GerritChange, GerritChangeMessages, GerritChanges, GerritMergeableInfo, GerritProjectInfo, GerritRepos } from "./schema.js";
import { MAX_GERRIT_COMMENT_SIZE, MIN_GERRIT_VERSION, mapPrStateToGerritFilter } from "./utils.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import { z } from "zod/v4";
import semver from "semver";
//#region lib/modules/platform/gerrit/client.ts
var GerritClient = class {
	gerritHttp = new GerritHttp({ memCache: false });
	gerritVersion = MIN_GERRIT_VERSION;
	setGerritVersion(version) {
		this.gerritVersion = version;
	}
	async getGerritVersion(options) {
		return (await this.gerritHttp.getJson("a/config/server/version", options, z.string())).body;
	}
	async getRepos() {
		const res = await this.gerritHttp.getJson("a/projects/?type=CODE&state=ACTIVE", GerritRepos);
		return Object.keys(res.body);
	}
	async getProjectInfo(repository) {
		const projectInfo = await this.gerritHttp.getJson(`a/projects/${encodeURIComponent(repository)}`, GerritProjectInfo);
		if (projectInfo.body.state !== "ACTIVE") throw new Error(REPOSITORY_ARCHIVED);
		return projectInfo.body;
	}
	async getBranchInfo(repository) {
		return (await this.gerritHttp.getJson(`a/projects/${encodeURIComponent(repository)}/branches/HEAD`, GerritBranchInfo)).body;
	}
	async getBranchChange(repository, config) {
		const changes = await this.findChanges(repository, {
			branchName: config.branchName,
			state: config.state,
			singleChange: config.targetBranch ? false : true,
			requestDetails: config.requestDetails
		});
		if (changes.length === 0) return null;
		if (changes.length === 1) return changes[0];
		if (config.targetBranch) {
			const change = changes.find((c) => c.branch === config.targetBranch);
			if (change) return change;
		}
		return changes[0];
	}
	async findChanges(repository, findPRConfig) {
		const startOffset = findPRConfig.startOffset ?? 0;
		const query = { n: findPRConfig.singleChange ? 1 : findPRConfig.pageLimit ?? 50 };
		if (findPRConfig.requestDetails) query.o = findPRConfig.requestDetails;
		const filters = this.buildSearchFilters(repository, findPRConfig);
		const allChanges = [];
		while (true) {
			query.S = allChanges.length + startOffset;
			const queryString = `q=${filters.join("+")}&${getQueryString(query)}`;
			const changes = await this.gerritHttp.getJson(`a/changes/?${queryString}`, GerritChanges);
			logger.trace(`findChanges(${queryString},start=${query.S},limit=${query.n}) => ${changes.body.length}`);
			const lastChange = changes.body.at(-1);
			let hasMoreChanges = false;
			if (lastChange?._more_changes) {
				hasMoreChanges = true;
				delete lastChange._more_changes;
			}
			allChanges.push(...changes.body);
			if (findPRConfig.singleChange || findPRConfig.noPagination || !hasMoreChanges) break;
		}
		return allChanges;
	}
	async getChange(changeNumber, requestDetails) {
		const queryString = getQueryString({ o: requestDetails });
		return (await this.gerritHttp.getJson(`a/changes/${changeNumber}?${queryString}`, GerritChange)).body;
	}
	async getMergeableInfo(change) {
		return (await this.gerritHttp.getJson(`a/changes/${change._number}/revisions/current/mergeable`, GerritMergeableInfo)).body;
	}
	async abandonChange(changeNumber, message) {
		await this.gerritHttp.postJson(`a/changes/${changeNumber}/abandon`, { body: {
			message,
			notify: "OWNER_REVIEWERS"
		} });
	}
	async submitChange(changeNumber) {
		return (await this.gerritHttp.postJson(`a/changes/${changeNumber}/submit`)).body;
	}
	async getMessages(changeNumber) {
		return (await this.gerritHttp.getJson(`a/changes/${changeNumber}/messages`, GerritChangeMessages)).body;
	}
	async addMessage(changeNumber, fullMessage, tag) {
		const message = this.normalizeMessage(fullMessage);
		await this.gerritHttp.postJson(`a/changes/${changeNumber}/revisions/current/review`, { body: {
			message,
			tag,
			notify: "NONE"
		} });
	}
	async checkForExistingMessage(changeNumber, newMessage, msgType) {
		return (await this.getMessages(changeNumber)).some((existingMsg) => (msgType === void 0 || msgType === existingMsg.tag) && existingMsg.message.includes(newMessage));
	}
	async addMessageIfNotAlreadyExists(changeNumber, message, tag) {
		const newMsg = this.normalizeMessage(message);
		if (!await this.checkForExistingMessage(changeNumber, newMsg, tag)) await this.addMessage(changeNumber, newMsg, tag);
	}
	async setLabel(changeNumber, label, value) {
		await this.gerritHttp.postJson(`a/changes/${changeNumber}/revisions/current/review`, { body: {
			labels: { [label]: value },
			notify: "NONE"
		} });
	}
	async setHashtags(changeNumber, hashtagsInput) {
		const { add, remove } = hashtagsInput;
		if (isNonEmptyArray(add) || isNonEmptyArray(remove)) await this.gerritHttp.postJson(`a/changes/${changeNumber}/hashtags`, { body: {
			add,
			remove
		} });
	}
	async addReviewers(changeNumber, reviewers) {
		await this.gerritHttp.postJson(`a/changes/${changeNumber}/revisions/current/review`, { body: {
			reviewers: reviewers.map((r) => ({ reviewer: r })),
			notify: "OWNER_REVIEWERS"
		} });
	}
	async addAssignee(changeNumber, assignee) {
		await this.gerritHttp.putJson(`a/changes/${changeNumber}/assignee`, { body: { assignee } });
	}
	async getFile(repo, branch, fileName) {
		const base64Content = await this.gerritHttp.getText(`a/projects/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}/files/${encodeURIComponent(fileName)}/content`);
		return Buffer.from(base64Content.body, "base64").toString();
	}
	async moveChange(changeNumber, destinationBranch) {
		return (await this.gerritHttp.postJson(`a/changes/${changeNumber}/move`, { body: { destination_branch: destinationBranch } })).body;
	}
	normalizeMessage(message) {
		let msg = message.trim();
		const encoder = new TextEncoder();
		const bytes = encoder.encode(msg);
		if (bytes.length > 16384) {
			const truncationNotice = "\n\n[Truncated by Renovate]";
			const truncationNoticeBytes = encoder.encode(truncationNotice);
			const maxContentBytes = MAX_GERRIT_COMMENT_SIZE - truncationNoticeBytes.length;
			const truncatedBytes = bytes.slice(0, maxContentBytes);
			msg = new TextDecoder().decode(truncatedBytes) + truncationNotice;
		}
		return msg;
	}
	buildSearchFilters(repository, searchConfig) {
		const filters = [
			"owner:self",
			`project:${repository}`,
			"-is:wip",
			"-is:private"
		];
		const filterState = mapPrStateToGerritFilter(searchConfig.state);
		if (filterState) filters.push(filterState);
		if (searchConfig.branchName) filters.push(`footer:Renovate-Branch=${searchConfig.branchName}`);
		else if (semver.gte(this.gerritVersion, "3.6.0")) filters.push("hasfooter:Renovate-Branch");
		else filters.push("message:\"Renovate-Branch: \"");
		if (searchConfig.targetBranch) filters.push(`branch:${searchConfig.targetBranch}`);
		if (searchConfig.label) filters.push(`label:Code-Review=${searchConfig.label}`);
		if (searchConfig.prTitle) {
			const escapedTitle = searchConfig.prTitle.replaceAll("\"", "\\\"");
			if (semver.gte(this.gerritVersion, "3.8.0")) filters.push(`subject:"${escapedTitle}"`);
			else filters.push(`message:"${escapedTitle}"`);
		}
		return filters;
	}
};
const client = new GerritClient();
//#endregion
export { client };

//# sourceMappingURL=client.js.map