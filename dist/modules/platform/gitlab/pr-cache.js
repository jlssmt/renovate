import { get, set } from "../../../util/cache/memory/index.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getQueryString } from "../../../util/url.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { GitLabMergeRequests } from "./schema.js";
import { prInfo } from "./utils.js";
//#region lib/modules/platform/gitlab/pr-cache.ts
var GitlabPrCache = class GitlabPrCache {
	items = [];
	cache;
	repo;
	ignorePrAuthor;
	constructor(repo, author, ignorePrAuthor) {
		this.repo = repo;
		this.ignorePrAuthor = ignorePrAuthor;
		const repoCache = getCache();
		repoCache.platform ??= {};
		repoCache.platform.gitlab ??= {};
		let pullRequestCache = repoCache.platform.gitlab.pullRequestsCache;
		if (!pullRequestCache) {
			logger.debug("Initializing new PR cache at repository cache");
			pullRequestCache = {
				items: {},
				updated_at: null,
				author
			};
		} else if (pullRequestCache.author !== author) {
			logger.debug("Resetting PR cache because authors do not match");
			pullRequestCache = {
				items: {},
				updated_at: null,
				author
			};
		} else if (pullRequestCache.updated_at?.match(regEx(/\.\d\d\dZ$/))) {
			logger.debug("Resetting PR cache of older format");
			pullRequestCache = {
				items: {},
				updated_at: null,
				author
			};
		}
		repoCache.platform.gitlab.pullRequestsCache = pullRequestCache;
		this.cache = pullRequestCache;
		this.updateItems();
	}
	static async init(http, repo, author, ignorePrAuthor) {
		const res = new GitlabPrCache(repo, author, ignorePrAuthor);
		if (!get("gitlab-pr-cache-synced")) {
			await res.sync(http);
			set("gitlab-pr-cache-synced", true);
		}
		return res;
	}
	getPrs() {
		return this.items;
	}
	static async getPrs(http, repo, author, ignorePrAuthor) {
		return (await GitlabPrCache.init(http, repo, author, ignorePrAuthor)).getPrs();
	}
	setPr(pr) {
		logger.debug(`Adding PR #${pr.number} to the PR cache`);
		this.cache.items[pr.number] = pr;
		this.updateItems();
	}
	static async setPr(http, repo, author, item, ignorePrAuthor) {
		(await GitlabPrCache.init(http, repo, author, ignorePrAuthor)).setPr(item);
	}
	async sync(http) {
		logger.debug("Syncing PR list");
		const searchParams = {
			per_page: "100",
			order_by: "updated_at",
			sort: "desc"
		};
		const opts = { paginate: true };
		const updated_after = this.cache.updated_at;
		if (updated_after) {
			opts.cacheProvider = repoCacheProvider;
			searchParams.updated_after = updated_after;
		}
		if (!this.ignorePrAuthor) searchParams.scope = "created_by_me";
		const query = getQueryString(searchParams);
		const { body: items } = await http.getJson(`/projects/${this.repo}/merge_requests?${query}`, opts, GitLabMergeRequests);
		if (items.length) {
			for (const item of items) {
				const id = item.iid;
				this.cache.items[id] = prInfo(item);
			}
			const [{ updated_at }] = items;
			this.cache.updated_at = updated_at.replace(regEx(/\.\d\d\dZ$/), "Z");
		}
		this.updateItems();
		return this;
	}
	/**
	* Ensure the pr cache starts with the most recent PRs.
	*/
	updateItems() {
		this.items = Object.values(this.cache.items).sort((a, b) => b.number - a.number);
	}
};
//#endregion
export { GitlabPrCache };

//# sourceMappingURL=pr-cache.js.map