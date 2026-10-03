import { logger } from "../../../logger/index.js";
import { BitbucketHttp } from "../../../util/http/bitbucket.js";
//#region lib/modules/platform/bitbucket/comments.ts
const REOPEN_PR_COMMENT_KEYWORD = "reopen!";
const bitbucketHttp = new BitbucketHttp();
async function getComments(config, prNo) {
	const comments = (await bitbucketHttp.getJsonUnchecked(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/comments`, { paginate: true })).body.values;
	logger.debug(`Found ${comments.length} comments`);
	return comments;
}
async function addComment(config, prNo, raw) {
	await bitbucketHttp.postJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/comments`, { body: { content: { raw } } });
}
async function editComment(config, prNo, commentId, raw) {
	await bitbucketHttp.putJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/comments/${commentId}`, { body: { content: { raw } } });
}
async function deleteComment(config, prNo, commentId) {
	await bitbucketHttp.deleteJson(`/2.0/repositories/${config.repository}/pullrequests/${prNo}/comments/${commentId}`);
}
async function ensureComment({ config, number: prNo, topic, content }) {
	try {
		const comments = await getComments(config, prNo);
		let body;
		let commentId;
		let commentNeedsUpdating;
		if (topic) {
			logger.debug(`Ensuring comment "${topic}" in #${prNo}`);
			body = `### ${topic}\n\n${content}`;
			comments.forEach((comment) => {
				// v8 ignore else -- TODO: add test #40625
				if (comment.content.raw.startsWith(`### ${topic}\n\n`)) {
					commentId = comment.id;
					commentNeedsUpdating = comment.content.raw !== body;
				}
			});
		} else {
			logger.debug(`Ensuring content-only comment in #${prNo}`);
			body = `${content}`;
			comments.forEach((comment) => {
				// v8 ignore else -- TODO: add test #40625
				if (comment.content.raw === body) {
					commentId = comment.id;
					commentNeedsUpdating = false;
				}
			});
		}
		body = sanitizeCommentBody(body);
		if (!commentId) {
			await addComment(config, prNo, body);
			logger.info({
				repository: config.repository,
				prNo,
				topic
			}, "Comment added");
		} else if (commentNeedsUpdating) {
			await editComment(config, prNo, commentId, body);
			logger.debug({
				repository: config.repository,
				prNo
			}, "Comment updated");
		} else logger.debug("Comment is already up-to-date");
		return true;
	} catch (err) /* v8 ignore next -- defensive: comment API failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Error ensuring comment");
		return false;
	}
}
async function reopenComments(config, prNo) {
	return (await getComments(config, prNo)).filter((comment) => comment.content.raw.startsWith(REOPEN_PR_COMMENT_KEYWORD));
}
function byTopic(comment, topic) {
	return comment.content.raw.startsWith(`### ${topic}\n\n`);
}
function byContent(comment, content) {
	return comment.content.raw.trim() === content;
}
async function ensureCommentRemoval(config, deleteConfig) {
	try {
		const { number: prNo } = deleteConfig;
		const key = deleteConfig.type === "by-topic" ? deleteConfig.topic : deleteConfig.content;
		logger.debug(`Ensuring comment "${key}" in #${prNo} is removed`);
		const comments = await getComments(config, prNo);
		let commentId = void 0;
		// v8 ignore else -- TODO: add test #40625
		if (deleteConfig.type === "by-topic") {
			const topic = deleteConfig.topic;
			commentId = comments.find((comment) => byTopic(comment, topic))?.id;
		} else if (deleteConfig.type === "by-content") {
			const content = deleteConfig.content;
			commentId = comments.find((comment) => byContent(comment, content))?.id;
		}
		if (commentId) await deleteComment(config, prNo, commentId);
	} catch (err) /* v8 ignore next -- defensive: comment API failures are logged and swallowed, not simulated in specs */ {
		logger.warn({ err }, "Error ensuring comment removal");
	}
}
function sanitizeCommentBody(body) {
	return body.replace("checking the rebase/retry box above", "renaming this PR to start with \"rebase!\"").replace("rename this PR to get a fresh replacement", "add a comment starting with \"reopen!\" to get a fresh replacement");
}
//#endregion
export { REOPEN_PR_COMMENT_KEYWORD, ensureComment, ensureCommentRemoval, reopenComments };

//# sourceMappingURL=comments.js.map