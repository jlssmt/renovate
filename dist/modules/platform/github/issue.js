import { get, set } from "../../../util/cache/memory/index.js";
import { logger } from "../../../logger/index.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { DateTime } from "luxon";
//#region lib/modules/platform/github/issue.ts
var GithubIssueCache = class {
	static reset(cacheData) {
		set("github-issues-reconcile-queue", null);
		const repoCache = getCache();
		repoCache.platform ??= {};
		repoCache.platform.github ??= {};
		if (cacheData) repoCache.platform.github.issuesCache = cacheData;
		else delete repoCache.platform.github.issuesCache;
	}
	static get data() {
		let cacheData = getCache().platform?.github?.issuesCache;
		if (!cacheData) return null;
		cacheData = this.reconcile(cacheData);
		return cacheData;
	}
	static getIssues() {
		const cacheData = this.data;
		if (!cacheData) return null;
		return Object.values(cacheData).sort(({ lastModified: a }, { lastModified: b }) => DateTime.fromISO(b).toMillis() - DateTime.fromISO(a).toMillis());
	}
	static setIssues(issues) {
		const cacheData = {};
		for (const issue of issues) cacheData[issue.number] = issue;
		logger.debug(`Issues cache: Setting ${issues.length} issues in cache`);
		this.reset(cacheData);
	}
	static updateIssue(issue) {
		const cacheData = this.data;
		if (cacheData) {
			logger.debug(`Issues cache: Updating issue ${issue.number} in cache`);
			cacheData[issue.number] = issue;
		}
	}
	static deleteIssue(number) {
		const cacheData = this.data;
		if (cacheData) {
			logger.debug(`Issues cache: Deleting issue ${number} from cache`);
			delete cacheData[number];
		}
	}
	/**
	* At the moment of repo initialization, repository cache is not available.
	* What we can do is to store issues for later reconciliation.
	*/
	static addIssuesToReconcile(issues) {
		logger.debug(`Issues cache: Adding ${issues?.length} issues to reconcile queue`);
		set("github-issues-reconcile-queue", issues);
	}
	static reconcile(cacheData) {
		const issuesToReconcile = get("github-issues-reconcile-queue");
		if (!issuesToReconcile) return cacheData;
		let isReconciled = false;
		for (const issue of issuesToReconcile) {
			const cachedIssue = cacheData[issue.number];
			if (cachedIssue?.number === issue.number && cachedIssue.lastModified === issue.lastModified) {
				isReconciled = true;
				logger.debug(`Issues cache: Done reconciling at issue ${issue.number}`);
				break;
			}
			cacheData[issue.number] = issue;
		}
		if (issuesToReconcile.length >= Object.keys(cacheData).length) {
			logger.debug(`Issues cache: Done reconciling by iterating over all items`);
			isReconciled = true;
		}
		if (!isReconciled) {
			logger.debug("Issues cache: reset");
			this.reset(null);
			return null;
		}
		logger.debug("Issues cache: synced");
		this.reset(cacheData);
		return cacheData;
	}
};
//#endregion
export { GithubIssueCache };

//# sourceMappingURL=issue.js.map