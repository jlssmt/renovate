import { CONFIG_GIT_URL_UNAVAILABLE } from "../../../constants/error-messages.js";
import { getEnv } from "../../../util/env.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { find } from "../../../util/host-rules.js";
import { getPrBodyStruct } from "../pr-body.js";
import { isNonEmptyArray, isNonEmptyString } from "@sindresorhus/is";
import URL from "node:url";
//#region lib/modules/platform/gitlab/utils.ts
const DRAFT_PREFIX = "Draft: ";
const DRAFT_PREFIX_DEPRECATED = "WIP: ";
const defaults = {
	hostType: "gitlab",
	endpoint: "https://gitlab.com/api/v4/",
	version: "0.0.0"
};
function prInfo(mr) {
	const pr = {
		sourceBranch: mr.source_branch,
		targetBranch: mr.target_branch,
		state: mr.state === "opened" ? "open" : mr.state,
		number: mr.iid,
		title: mr.title,
		createdAt: mr.created_at,
		hasAssignees: !!(mr.assignee?.id ?? mr.assignees?.[0]?.id),
		bodyStruct: getPrBodyStruct(mr.description),
		...mr.target_branch && { targetBranch: mr.target_branch },
		...mr.head_pipeline?.status && { headPipelineStatus: mr.head_pipeline?.status },
		...mr.head_pipeline?.sha && { headPipelineSha: mr.head_pipeline?.sha },
		...isNonEmptyArray(mr.reviewers) && { reviewers: mr.reviewers?.map(({ username }) => username) },
		...mr.labels && { labels: mr.labels },
		...mr.sha && { sha: mr.sha }
	};
	if (pr.title.startsWith("Draft: ")) {
		pr.title = pr.title.substring(7);
		pr.isDraft = true;
	} else if (pr.title.startsWith("WIP: ")) {
		pr.title = pr.title.substring(5);
		pr.isDraft = true;
	}
	return pr;
}
function getRepoUrl(repository, gitUrl, res) {
	if (gitUrl === "ssh") {
		if (!res.body.ssh_url_to_repo) throw new Error(CONFIG_GIT_URL_UNAVAILABLE);
		logger.debug(`Using ssh URL: ${res.body.ssh_url_to_repo}`);
		return res.body.ssh_url_to_repo;
	}
	const opts = find({
		hostType: defaults.hostType,
		url: defaults.endpoint
	});
	const env = getEnv();
	if (gitUrl === "endpoint" || isNonEmptyString(env.GITLAB_IGNORE_REPO_URL) || res.body.http_url_to_repo === null) {
		if (res.body.http_url_to_repo === null) logger.debug("no http_url_to_repo found. Falling back to old behavior.");
		if (env.GITLAB_IGNORE_REPO_URL) logger.warn("GITLAB_IGNORE_REPO_URL environment variable is deprecated. Please use \"gitUrl\" option.");
		const parsedEndpoint = parseUrl(defaults.endpoint);
		if (!parsedEndpoint) throw new Error(`Invalid GitLab endpoint: ${defaults.endpoint}`);
		const { protocol, host, pathname } = parsedEndpoint;
		const newPathname = pathname.slice(0, pathname.indexOf("/api"));
		const uri = URL.format({
			/* v8 ignore start: should never happen (#40625) */
			protocol: protocol.slice(0, -1) || "https",
			/* v8 ignore stop */
			auth: `oauth2:${opts.token}`,
			host,
			pathname: `${newPathname}/${repository}.git`
		});
		logger.debug(`Using URL based on configured endpoint, url:${uri}`);
		return uri;
	}
	logger.debug(`Using http URL: ${res.body.http_url_to_repo}`);
	const repoUrl = parseUrl(res.body.http_url_to_repo);
	if (!repoUrl) return "";
	repoUrl.username = "oauth2";
	repoUrl.password = opts.token;
	return repoUrl.toString();
}
//#endregion
export { DRAFT_PREFIX, DRAFT_PREFIX_DEPRECATED, defaults, getRepoUrl, prInfo };

//# sourceMappingURL=utils.js.map