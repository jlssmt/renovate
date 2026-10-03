import { CONFIG_GIT_URL_UNAVAILABLE } from "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts, parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { toLongCommitSha } from "../../../util/schema-utils/git.js";
import { hashBody } from "../pr-body.js";
//#region lib/modules/platform/gerrit/utils.ts
const MIN_GERRIT_VERSION = "3.0.0";
const TAG_PULL_REQUEST_BODY = "pull-request";
const DEFAULT_SSH_PORT = `29418`;
/**
* Max comment size in Gerrit (16kiB by default)
* https://gerrit-review.googlesource.com/Documentation/config-gerrit.html#change:~:text=change.commentSizeLimit
*/
const MAX_GERRIT_COMMENT_SIZE = 16384;
const REQUEST_DETAILS_FOR_PRS = [
	"MESSAGES",
	"LABELS",
	"DETAILED_ACCOUNTS",
	"CURRENT_REVISION",
	"COMMIT_FOOTERS"
];
function getGerritRepoUrl(repository, endpoint, gitUrl, username) {
	const endpointUrl = parseUrl(endpoint);
	if (!endpointUrl) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
	const url = gitUrl === "ssh" ? createSshUrl(endpointUrl, repository, username) : createHttpUrl(endpointUrl, endpoint, repository);
	logger.trace({ url }, "using URL based on configured endpoint");
	return url;
}
function createSshUrl(url, repository, username) {
	return `ssh://${username}@${url.hostname}:${DEFAULT_SSH_PORT}/${repository}`;
}
function createHttpUrl(url, endpoint, repository) {
	const opts = find({
		hostType: "gerrit",
		url: endpoint
	});
	if (!(opts.username && opts.password)) throw new Error("Init: You must configure a Gerrit Server username/password");
	url.username = opts.username;
	url.password = opts.password;
	url.pathname = joinUrlParts(url.pathname, "a", repository);
	return url.toString();
}
function mapPrStateToGerritFilter(state) {
	switch (state) {
		case "merged": return "status:merged";
		case "open": return "status:open";
		case "closed": return "status:abandoned";
		case "!open": return "-status:open";
		default: return null;
	}
}
function mapGerritChangeToPr(change, knownProperties) {
	const sourceBranch = knownProperties?.sourceBranch ?? extractSourceBranch(change);
	if (!sourceBranch) return null;
	return {
		number: change._number,
		state: mapGerritChangeStateToPrState(change.status),
		sourceBranch,
		targetBranch: change.branch,
		title: change.subject,
		createdAt: convertGerritDateToISO(change.created),
		labels: change.hashtags,
		reviewers: coerceArray(change.reviewers?.REVIEWER?.map((reviewer) => reviewer.username)),
		bodyStruct: { hash: hashBody(knownProperties?.prBody ?? findPullRequestBody(change)) },
		sha: toLongCommitSha(change.current_revision)
	};
}
function mapGerritChangeStateToPrState(state) {
	switch (state) {
		case "NEW": return "open";
		case "MERGED": return "merged";
		case "ABANDONED": return "closed";
	}
}
function extractSourceBranch(change) {
	let sourceBranch = void 0;
	if (change.current_revision) {
		const re = regEx(/^Renovate-Branch: (?<branch>.+)$/m);
		const message = change.revisions[change.current_revision].commit_with_footers;
		// v8 ignore else -- TODO: add test #40625
		if (message) sourceBranch = re.exec(message)?.groups?.branch;
	}
	return sourceBranch ?? void 0;
}
function findPullRequestBody(change) {
	const msg = Array.from(coerceArray(change.messages)).reverse().find((msg) => msg.tag === TAG_PULL_REQUEST_BODY);
	if (msg) return msg.message.replace(regEx(/^Patch Set \d+:\n\n/), "");
}
function mapBranchStatusToLabel(state, label) {
	const numbers = Object.keys(label.values).map((x) => parseInt(x, 10));
	switch (state) {
		case "green": return Math.max(...numbers);
		case "yellow":
		case "red": return Math.min(...numbers);
	}
	/* v8 ignore next -- only reachable for the artificial 'UNKNOWN' state, which callers never pass */
	return label.default_value;
}
function convertGerritDateToISO(date) {
	return date.replace(" ", "T");
}
//#endregion
export { MAX_GERRIT_COMMENT_SIZE, MIN_GERRIT_VERSION, REQUEST_DETAILS_FOR_PRS, TAG_PULL_REQUEST_BODY, convertGerritDateToISO, extractSourceBranch, findPullRequestBody, getGerritRepoUrl, mapBranchStatusToLabel, mapGerritChangeStateToPrState, mapGerritChangeToPr, mapPrStateToGerritFilter };

//# sourceMappingURL=utils.js.map