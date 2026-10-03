import { logger } from "../../logger/index.js";
import { isInteger, isNumber, isUndefined } from "@sindresorhus/is";
//#region lib/workers/global/limits.ts
const limits = /* @__PURE__ */ new Map();
function setMaxLimit(key, val) {
	const max = typeof val === "number" ? Math.max(0, val) : null;
	limits.set(key, {
		current: 0,
		max
	});
	logger.debug(`${key} limit = ${max}`);
}
function incLimitedValue(key, incBy = 1) {
	const limit = limits.get(key) ?? {
		max: null,
		current: 0
	};
	limits.set(key, {
		...limit,
		current: limit.current + incBy
	});
}
function handleCommitsLimit() {
	const limit = limits.get("Commits");
	if (!limit || limit.max === null) return false;
	const { max, current } = limit;
	const res = max - current <= 0;
	if (res) logger.debug({
		current,
		max
	}, "Commits limit reached");
	return res;
}
const counts = /* @__PURE__ */ new Map();
function getCount(key) {
	const count = counts.get(key);
	// istanbul ignore if: should not happen
	if (!isInteger(count)) {
		logger.debug(`Could not compute the count of ${key}, returning zero.`);
		return 0;
	}
	return count;
}
function setCount(key, val) {
	counts.set(key, val);
	logger.debug(`${key} count = ${val}`);
}
function incCountValue(key, incBy = 1) {
	const count = getCount(key);
	counts.set(key, count + incBy);
}
/**
* Vulnerability alerts are counted separately from other updates, so that a
* limit set under `vulnerabilityAlerts` is a budget of its own rather than a
* share of the repository-wide one.
*/
function vulnerabilityCountName(key) {
	return key === "Branches" ? "VulnerabilityBranches" : "VulnerabilityConcurrentPRs";
}
function handleConcurrentLimits(key, config) {
	if (key === "HourlyCommits") {
		const hourlyCommitLimit = calcLimit(config.upgrades, "commitHourlyLimit");
		const hourlyCommitCount = getCount("HourlyCommits");
		if (hourlyCommitLimit && hourlyCommitCount >= hourlyCommitLimit) {
			logger.debug({
				hourlyCommitCount,
				hourlyCommitLimit
			}, "Hourly commits limit reached");
			return true;
		}
		return false;
	}
	if (!config.isVulnerabilityAlert) {
		const hourlyPrLimit = calcLimit(config.upgrades, "prHourlyLimit");
		const hourlyPrCount = getCount("HourlyPRs");
		if (hourlyPrLimit && hourlyPrCount >= hourlyPrLimit) {
			logger.debug({
				hourlyPrCount,
				hourlyPrLimit
			}, "Hourly PRs limit reached");
			return true;
		}
	}
	const limitKey = key === "Branches" ? "branchConcurrentLimit" : "prConcurrentLimit";
	const limitValue = calcLimit(config.upgrades, limitKey);
	const countName = config.isVulnerabilityAlert ? vulnerabilityCountName(key) : key;
	const currentCount = getCount(countName);
	if (limitValue && currentCount >= limitValue) {
		logger.debug({
			limitKey,
			currentCount
		}, `${countName} limit reached`);
		return true;
	}
	return false;
}
function calcLimit(upgrades, limitName) {
	const uniqueUpgrades = new Map(upgrades.map((u) => [u.depName, u]));
	logger.debug({ limits: Array.from(uniqueUpgrades.values()).map((upg) => {
		return {
			depName: upg.depName,
			[limitName]: upg[limitName]
		};
	}) }, `${limitName} of the upgrades present in this branch`);
	if (hasMultipleLimits(upgrades, limitName)) logger.once.debug(`Branch has multiple ${limitName} limits. The lowest among these will be selected.`);
	let lowestLimit = Number.MAX_SAFE_INTEGER;
	for (const upgrade of upgrades) {
		let limit = upgrade[limitName];
		if (!isNumber(limit) && limitName === "branchConcurrentLimit") limit = upgrade.prConcurrentLimit;
		// istanbul ignore if: should never happen as all limits get a default value
		if (isUndefined(limit)) limit = Number.MAX_SAFE_INTEGER;
		if (limit === 0 || limit === null) {
			logger.debug(`${limitName} of this branch is unlimited, because at least one of the upgrade has it's ${limitName} set to "No limit" ie. 0 or null`);
			return 0;
		}
		lowestLimit = limit < lowestLimit ? limit : lowestLimit;
	}
	logger.debug(`Calculated lowest ${limitName} among the upgrades present in this branch is ${lowestLimit}.`);
	return lowestLimit;
}
function hasMultipleLimits(upgrades, limitName) {
	if (upgrades.length === 1) return false;
	const distinctLimits = /* @__PURE__ */ new Set();
	for (const upgrade of upgrades) {
		let limitValue = upgrade[limitName];
		if (limitName === "branchConcurrentLimit" && !isNumber(limitValue)) limitValue = upgrade.prConcurrentLimit;
		// istanbul ignore if: should not happen as the limits are of type number
		if (limitValue === null) limitValue = 0;
		if (!isUndefined(limitValue) && !distinctLimits.has(limitValue)) distinctLimits.add(limitValue);
	}
	return distinctLimits.size > 1;
}
function isLimitReached(limit, config) {
	if (limit === "Commits") return handleCommitsLimit();
	if (config) return handleConcurrentLimits(limit, config);
	throw new Error("Config is required for computing limits for Branches and PullRequests");
}
//#endregion
export { calcLimit, counts, getCount, hasMultipleLimits, incCountValue, incLimitedValue, isLimitReached, setCount, setMaxLimit };

//# sourceMappingURL=limits.js.map