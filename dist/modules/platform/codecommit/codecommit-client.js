import { REPOSITORY_UNINITIATED } from "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isString } from "@sindresorhus/is";
import { CodeCommitClient, CreatePullRequestApprovalRuleCommand, CreatePullRequestCommand, DeleteCommentContentCommand, GetCommentsForPullRequestCommand, GetFileCommand, GetPullRequestCommand, GetRepositoryCommand, ListPullRequestsCommand, ListRepositoriesCommand, PostCommentForPullRequestCommand, PullRequestStatusEnum, UpdateCommentCommand, UpdatePullRequestDescriptionCommand, UpdatePullRequestStatusCommand, UpdatePullRequestTitleCommand } from "@aws-sdk/client-codecommit";
import * as aws4 from "aws4";
//#region lib/modules/platform/codecommit/codecommit-client.ts
let codeCommitClient;
function buildCodeCommitClient() {
	if (!codeCommitClient) codeCommitClient = new CodeCommitClient({});
	/* v8 ignore next -- unreachable: the client was just constructed above */
	if (!codeCommitClient) throw new Error("Failed to initialize codecommit client");
}
async function deleteComment(commentId) {
	const cmd = new DeleteCommentContentCommand({ commentId });
	return await codeCommitClient.send(cmd);
}
async function getPrComments(pullRequestId) {
	const cmd = new GetCommentsForPullRequestCommand({ pullRequestId });
	return await codeCommitClient.send(cmd);
}
async function updateComment(commentId, content) {
	const cmd = new UpdateCommentCommand({
		commentId,
		content
	});
	return await codeCommitClient.send(cmd);
}
async function createPrComment(pullRequestId, repositoryName, content, beforeCommitId, afterCommitId) {
	const cmd = new PostCommentForPullRequestCommand({
		pullRequestId,
		repositoryName,
		content,
		afterCommitId,
		beforeCommitId
	});
	return await codeCommitClient.send(cmd);
}
async function updatePrStatus(pullRequestId, pullRequestStatus) {
	const cmd = new UpdatePullRequestStatusCommand({
		pullRequestId,
		pullRequestStatus
	});
	return await codeCommitClient.send(cmd);
}
async function updatePrTitle(prNo, title) {
	const input = {
		pullRequestId: `${prNo}`,
		title
	};
	const cmd = new UpdatePullRequestTitleCommand(input);
	return await codeCommitClient.send(cmd);
}
async function updatePrDescription(pullRequestId, description) {
	const cmd = new UpdatePullRequestDescriptionCommand({
		pullRequestId,
		description
	});
	return await codeCommitClient.send(cmd);
}
async function createPr(title, description, sourceReference, destinationReference, repositoryName) {
	const cmd = new CreatePullRequestCommand({
		title,
		description,
		targets: [{
			sourceReference,
			destinationReference,
			repositoryName
		}]
	});
	return await codeCommitClient.send(cmd);
}
async function getFile(repositoryName, filePath, commitSpecifier) {
	const cmd = new GetFileCommand({
		repositoryName,
		filePath,
		commitSpecifier
	});
	return await codeCommitClient.send(cmd);
}
async function listPullRequests(repositoryName) {
	const input = {
		repositoryName,
		pullRequestStatus: PullRequestStatusEnum.OPEN
	};
	const cmd = new ListPullRequestsCommand(input);
	return await codeCommitClient.send(cmd);
}
async function getRepositoryInfo(repository) {
	const input = { repositoryName: `${repository}` };
	const cmd = new GetRepositoryCommand(input);
	return await codeCommitClient.send(cmd);
}
async function getPr(pullRequestId) {
	const cmd = new GetPullRequestCommand({ pullRequestId });
	let res;
	try {
		res = await codeCommitClient.send(cmd);
	} catch (err) {
		logger.debug({ err }, "failed to get PR using prId");
	}
	return res;
}
async function listRepositories() {
	const cmd = new ListRepositoriesCommand({});
	return await codeCommitClient.send(cmd);
}
async function createPrApprovalRule(pullRequestId, approvalRuleContent) {
	const cmd = new CreatePullRequestApprovalRuleCommand({
		approvalRuleContent,
		approvalRuleName: "Reviewers By Renovate",
		pullRequestId
	});
	return await codeCommitClient.send(cmd);
}
function getCodeCommitUrl(repoMetadata, repoName) {
	logger.debug("get code commit url");
	const env = getEnv();
	if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
		if (repoMetadata.cloneUrlHttp) return repoMetadata.cloneUrlHttp;
		return `https://git-codecommit.${env.AWS_REGION ?? "us-east-1"}.amazonaws.com/v1/repos/${repoName}`;
	}
	const signer = new aws4.RequestSigner({
		service: "codecommit",
		host: `git-codecommit.${env.AWS_REGION ?? "us-east-1"}.amazonaws.com`,
		method: "GIT",
		path: `v1/repos/${repoName}`
	});
	const dateTime = signer.getDateTime();
	/* v8 ignore next -- defensive: the SigV4 signer always returns a datetime string */
	if (!isString(dateTime)) throw new Error(REPOSITORY_UNINITIATED);
	const token = `${dateTime}Z${signer.signature()}`;
	let username = `${env.AWS_ACCESS_KEY_ID}${env.AWS_SESSION_TOKEN ? `%${env.AWS_SESSION_TOKEN}` : ""}`;
	/* v8 ignore next -- only hit when an AWS session token contains '/', not present in spec env */
	if (username.includes("/")) username = username.replace(regEx(/\//g), "%2F");
	return `https://${username}:${token}@git-codecommit.${env.AWS_REGION ?? "us-east-1"}.amazonaws.com/v1/repos/${repoName}`;
}
//#endregion
export { buildCodeCommitClient, createPr, createPrApprovalRule, createPrComment, deleteComment, getCodeCommitUrl, getFile, getPr, getPrComments, getRepositoryInfo, listPullRequests, listRepositories, updateComment, updatePrDescription, updatePrStatus, updatePrTitle };

//# sourceMappingURL=codecommit-client.js.map