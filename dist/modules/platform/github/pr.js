import "../../../constants/error-messages.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { parseLinkHeader } from "../../../util/url.js";
import { instrument } from "../../../instrumentation/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { repoCacheProvider } from "../../../util/http/cache/repository-http-cache-provider.js";
import { coerceRestPr } from "./common.js";
import { prIsInMergeQueueQuery } from "./graphql.js";
import { ApiCache } from "./api-cache.js";
import { isEmptyArray, isNonEmptyArray } from "@sindresorhus/is";
import { DateTime } from "luxon";
//#region lib/modules/platform/github/pr.ts
function getPrApiCache() {
	const repoCache = getCache();
	if (!repoCache?.platform?.github?.pullRequestsCache) {
		logger.debug("PR cache: cached data not found, creating new cache");
		repoCache.platform ??= {};
		repoCache.platform.github ??= {};
		repoCache.platform.github.pullRequestsCache ??= { items: {} };
	}
	return new ApiCache(repoCache.platform.github.pullRequestsCache);
}
/**
*  Fetch and return Pull Requests from GitHub repository:
*
*   1. Synchronize long-term cache.
*
*   2. Store items in raw format, i.e. exactly what
*      has been returned by GitHub REST API.
*
*   3. Convert items to the Renovate format and return.
*
* In order synchronize ApiCache properly, we handle 3 cases:
*
*   a. We never fetched PR list for this repo before.
*      If cached PR list is empty, we assume it's the case.
*
*      In this case, we're falling back to quick fetch via
*      `paginate=true` option (see `util/http/github.ts`).
*
*   b. Some of PRs had changed since last run.
*
*      In this case, we sequentially fetch page by page
*      until the oldest item on an unfiltered page predates
*      the cache's `lastModified` timestamp.
*
*      We expect to fetch just one page per run in average,
*      since it's rare to have more than 100 updated PRs.
*/
async function getPrCache(http, repo, username) {
	const prApiCache = getPrApiCache();
	const isInitial = isEmptyArray(prApiCache.getItems());
	let lastModifiedRaw = prApiCache.getLastModified();
	if (!lastModifiedRaw && !isInitial) {
		const items = prApiCache.getItems();
		for (const item of items) if (!lastModifiedRaw || item.updated_at > lastModifiedRaw) lastModifiedRaw = item.updated_at;
	}
	const cutoffTime = lastModifiedRaw ? DateTime.fromISO(lastModifiedRaw) : null;
	try {
		const maxSyncPages = GlobalConfig.get("prCacheSyncMaxPages");
		const startTime = Date.now();
		let requestsTotal = 0;
		let apiQuotaAffected = false;
		let needNextPageFetch = true;
		let needNextPageSync = true;
		let pageIdx = 1;
		await instrument("sync GitHub PR cache", async () => {
			while (needNextPageFetch && needNextPageSync) {
				const opts = {
					paginate: false,
					memCache: false
				};
				if (pageIdx === 1) {
					opts.cacheProvider = repoCacheProvider;
					if (isInitial) opts.paginate = true;
				}
				let perPage;
				if (isInitial) {
					logger.debug("PR cache: initial fetch");
					perPage = 100;
				} else {
					logger.debug("PR cache: sync fetch");
					perPage = 20;
				}
				const urlPath = `repos/${repo}/pulls?per_page=${perPage}&state=all&sort=updated&direction=desc&page=${pageIdx}`;
				const res = await http.getJsonUnchecked(urlPath, opts);
				apiQuotaAffected = true;
				requestsTotal += 1;
				const { headers: { link: linkHeader } } = res;
				let { body: page } = res;
				if (!isInitial && cutoffTime && isNonEmptyArray(page)) {
					prApiCache.updateLastModified(page[0].updated_at);
					if (DateTime.fromISO(page.at(-1).updated_at) < cutoffTime) needNextPageSync = false;
				}
				if (username) {
					const filteredPage = page.filter((ghPr) => ghPr?.user?.login && ghPr.user.login === username);
					logger.debug(`PR cache: Filtered ${page.length} PRs to ${filteredPage.length} (user=${username})`);
					page = filteredPage;
				}
				const items = page.map(coerceRestPr);
				if (isNonEmptyArray(items)) prApiCache.reconcile(items);
				needNextPageFetch = !!parseLinkHeader(linkHeader)?.next;
				if (pageIdx === 1) needNextPageFetch &&= !opts.paginate;
				if (!isInitial && needNextPageFetch && needNextPageSync && pageIdx >= maxSyncPages) {
					logger.warn({
						repo,
						pages: pageIdx
					}, "PR cache: hit max sync pages, stopping");
					needNextPageSync = false;
				}
				pageIdx += 1;
			}
		});
		const durationMs = Math.round(Date.now() - startTime);
		logger.debug({
			pullsTotal: prApiCache.getItems().length,
			requestsTotal,
			apiQuotaAffected,
			durationMs
		}, `PR cache: getPrList success`);
	} catch (err) /* v8 ignore next -- PR cache sync failures are wrapped as ExternalHostError, not simulated in specs */ {
		logger.debug({ err }, "PR cache: getPrList err");
		throw new ExternalHostError(err, "github");
	}
	return prApiCache.getItems();
}
function updatePrCache(pr) {
	getPrApiCache().updateItem(pr);
}
/**
* Check whether the PR is currently in the merge queue.
* Fails open: errors are logged at debug level and treated as "not queued".
*/
async function isPrInMergeQueue(http, owner, name, prNo) {
	try {
		const res = await http.requestGraphql(prIsInMergeQueueQuery, {
			variables: {
				owner,
				name,
				number: prNo
			},
			readOnly: true,
			count: 1
		});
		if (res?.errors) {
			logger.debug({
				prNo,
				errors: res.errors
			}, "Failed to fetch PR merge queue status");
			return false;
		}
		return res?.data?.repository?.pullRequest?.isInMergeQueue === true;
	} catch (err) {
		if (err instanceof Error && err.message === "rate-limit-exceeded") throw err;
		logger.debug({
			prNo,
			err
		}, "Error fetching PR merge queue status");
		return false;
	}
}
//#endregion
export { getPrCache, isPrInMergeQueue, updatePrCache };

//# sourceMappingURL=pr.js.map