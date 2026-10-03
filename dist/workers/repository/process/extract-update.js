import { cleanDatasourceKeys } from "../../../util/cache/memory/index.js";
import { isNotNullOrUndefined } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { instrument } from "../../../instrumentation/index.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { checkGithubToken } from "../../../util/check-token.js";
import { scm } from "../../../modules/platform/scm.js";
import { hashMap } from "../../../modules/manager/fingerprint.generated.js";
import "../../../modules/manager/index.js";
import { fingerprint } from "../../../util/fingerprint.js";
import { Vulnerabilities } from "./vulnerabilities.js";
import { generateFingerprintConfig } from "../extract/extract-fingerprint-config.js";
import { extractAllDependencies } from "../extract/index.js";
import { branchifyUpgrades } from "../updates/branchify.js";
import { fetchUpdates } from "./fetch.js";
import { calculateLibYears } from "./libyear.js";
import { sortBranches } from "./sort.js";
import { writeUpdates } from "./write.js";
import { isNonEmptyArray } from "@sindresorhus/is";
// istanbul ignore next
function extractStats(packageFiles) {
	if (!packageFiles) return null;
	const stats = {
		managers: {},
		total: {
			fileCount: 0,
			depCount: 0
		}
	};
	for (const [manager, managerPackageFiles] of Object.entries(packageFiles)) {
		const fileCount = managerPackageFiles.length;
		let depCount = 0;
		for (const file of managerPackageFiles) depCount += file.deps.length;
		stats.managers[manager] = {
			fileCount,
			depCount
		};
		stats.total.fileCount += fileCount;
		stats.total.depCount += depCount;
	}
	return stats;
}
function isCacheExtractValid(baseBranchSha, configHash, cachedExtract) {
	if (!cachedExtract) return false;
	if (!cachedExtract.revision) {
		logger.debug("Cached extract is missing revision, so cannot be used");
		return false;
	}
	if (cachedExtract.revision !== 1) {
		logger.debug(`Extract cache revision has changed (old=${cachedExtract.revision}, new=1)`);
		return false;
	}
	if (!(cachedExtract.sha && cachedExtract.configHash)) return false;
	if (cachedExtract.sha !== baseBranchSha) {
		logger.debug(`Cached extract result cannot be used due to base branch SHA change (old=${cachedExtract.sha}, new=${baseBranchSha})`);
		return false;
	}
	if (cachedExtract.configHash !== configHash) {
		logger.debug("Cached extract result cannot be used due to config change");
		return false;
	}
	if (!cachedExtract.extractionFingerprints) {
		logger.debug("Cached extract is missing extractionFingerprints, so cannot be used");
		return false;
	}
	const changedManagers = /* @__PURE__ */ new Set();
	for (const [manager, fingerprint] of Object.entries(cachedExtract.extractionFingerprints)) if (fingerprint !== hashMap.get(manager)) changedManagers.add(manager);
	if (changedManagers.size > 0) {
		logger.debug({ changedManagers: [...changedManagers] }, "Manager fingerprint(s) have changed, extract cache cannot be reused");
		return false;
	}
	logger.debug(`Cached extract for sha=${baseBranchSha} is valid and can be used`);
	return true;
}
async function extract(config, overwriteCache = true) {
	logger.debug("extract()");
	const { baseBranch } = config;
	const baseBranchSha = await scm.getBranchCommit(baseBranch);
	let packageFiles;
	const cache = getCache();
	cache.scan ??= {};
	const cachedExtract = cache.scan[baseBranch];
	const configHash = instrument("fingerprint", () => fingerprint(generateFingerprintConfig(config)));
	// istanbul ignore if
	if (overwriteCache && isCacheExtractValid(baseBranchSha, configHash, cachedExtract)) {
		packageFiles = cachedExtract.packageFiles;
		try {
			for (const files of Object.values(packageFiles)) for (const file of files) for (const dep of file.deps) delete dep.updates;
			logger.debug("Deleted cached dep updates");
		} catch (err) {
			logger.info({ err }, "Error deleting cached dep updates");
		}
	} else {
		await instrument("checkoutBranch", async () => await scm.checkoutBranch(baseBranch));
		const extractResult = await instrument("extractAllDependencies", async () => await extractAllDependencies(config) || {});
		packageFiles = extractResult.packageFiles;
		const { extractionFingerprints } = extractResult;
		if (overwriteCache) cache.scan[baseBranch] = {
			revision: 1,
			sha: baseBranchSha,
			configHash,
			extractionFingerprints,
			packageFiles
		};
		const baseBranches = isNonEmptyArray(config.baseBranches) ? config.baseBranches : [baseBranch];
		Object.keys(cache.scan).forEach((branchName) => {
			if (!baseBranches.includes(branchName)) delete cache.scan[branchName];
		});
	}
	const stats = extractStats(packageFiles);
	logger.info({
		baseBranch: config.baseBranch,
		stats
	}, `Dependency extraction complete`);
	logger.trace({ config: packageFiles }, "packageFiles");
	checkGithubToken(packageFiles);
	return packageFiles;
}
async function fetchVulnerabilities(config, packageFiles) {
	if (config.osvVulnerabilityAlerts) {
		logger.debug("fetchVulnerabilities() - osvVulnerabilityAlerts=true");
		try {
			await (await Vulnerabilities.create()).appendVulnerabilityPackageRules(config, packageFiles);
		} catch (err) {
			logger.warn({ err }, "Unable to read vulnerability information");
		}
	}
}
async function lookup(config, packageFiles) {
	await fetchVulnerabilities(config, packageFiles);
	await fetchUpdates(config, packageFiles);
	await fetchVulnerabilities(config, packageFiles);
	cleanDatasourceKeys();
	calculateLibYears(config, packageFiles);
	const { branches, branchList } = await branchifyUpgrades(config, packageFiles);
	reportMaliciousSkippedDependencies(packageFiles);
	logger.debug({
		baseBranch: config.baseBranch,
		config: packageFiles
	}, "packageFiles with updates");
	sortBranches(branches);
	return {
		branches,
		branchList,
		packageFiles
	};
}
function reportMaliciousSkippedDependencies(allPackageFiles) {
	if (allPackageFiles === void 0) return;
	for (const [manager, packageFiles] of Object.entries(allPackageFiles)) for (const packageFile of packageFiles) for (const dep of packageFile.deps) if (dep.skipReason === "malicious-version-in-use") {
		logger.warn({
			packageFile: packageFile.packageFile,
			depName: dep.depName,
			packageName: dep.packageName,
			manager,
			datasource: dep.datasource
		}, "Dependency is currently using a malicious version");
		delete dep.skipReason;
		delete dep.skipStage;
	} else if (dep.skipReason === "malicious-update-proposed") {
		const newVersions = dep.updates?.map((u) => u.newVersion ?? u.newValue).filter(isNotNullOrUndefined);
		logger.warn({
			packageFile: packageFile.packageFile,
			depName: dep.depName,
			packageName: dep.packageName,
			manager,
			datasource: dep.datasource,
			newVersions
		}, "Dependency has update(s) proposed which would update you to a malicious version - skipping");
	}
}
function update(config, branches) {
	return writeUpdates(config, branches);
}
//#endregion
export { extract, isCacheExtractValid, lookup, reportMaliciousSkippedDependencies, update };

//# sourceMappingURL=extract-update.js.map