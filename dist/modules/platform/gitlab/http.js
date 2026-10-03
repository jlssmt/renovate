import { logger } from "../../../logger/index.js";
import { GitlabHttp } from "../../../util/http/gitlab.js";
import { GitLabProjectMembers } from "./schema.js";
import { isEmptyArray } from "@sindresorhus/is";
//#region lib/modules/platform/gitlab/http.ts
const gitlabApi = new GitlabHttp();
async function getUserID(username) {
	const userInfo = (await gitlabApi.getJsonUnchecked(`users?username=${username}`)).body;
	if (isEmptyArray(userInfo)) throw new Error(`User ID for the username: ${username} could not be found.`);
	return userInfo[0].id;
}
async function getGroupMembers(group) {
	const groupEncoded = encodeURIComponent(group);
	return (await gitlabApi.getJsonUnchecked(`groups/${groupEncoded}/members`)).body;
}
async function getMemberUserIDs(group) {
	try {
		return (await getGroupMembers(group)).map((u) => u.id);
	} catch (err) {
		logger.once.warn({
			group,
			errorMessage: err.message
		}, "Unable to fetch user IDs for group members");
		return [];
	}
}
async function getMemberUsernames(group) {
	return (await getGroupMembers(group)).map((u) => u.username);
}
async function getProjectMembers(repo) {
	const repoEncoded = encodeURIComponent(repo);
	return (await gitlabApi.getJson(`projects/${repoEncoded}/members`, { paginate: true }, GitLabProjectMembers)).body;
}
async function getProjectMembersByRole(repo, accessLevel) {
	return (await getProjectMembers(repo)).filter((m) => m.access_level === accessLevel);
}
async function isUserBusy(user) {
	try {
		const url = `/users/${user}/status`;
		return (await gitlabApi.getJsonUnchecked(url)).body.availability === "busy";
	} catch (err) {
		logger.warn({ err }, "Failed to get user status");
		return false;
	}
}
//#endregion
export { getMemberUserIDs, getMemberUsernames, getProjectMembersByRole, getUserID, gitlabApi, isUserBusy };

//# sourceMappingURL=http.js.map