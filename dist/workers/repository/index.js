import "../../constants/error-messages.js";
import { pkg } from "../../expose.js";
import { GlobalConfig } from "../../config/global.js";
import { resetRepositoryLogLevelRemaps } from "../../logger/remap.js";
import { logger, setMeta } from "../../logger/index.js";
import { ATTR_RENOVATE_SPLIT } from "../../instrumentation/types.js";
import { AbandonedPackageStats, DatasourceCacheStats, GetDatasourceReleasesStats, GitOperationStats, HttpCacheStats, HttpStats, LookupStats, ObsoleteCacheHitLogger, PackageCacheStats } from "../../util/stats.js";
import { instrument } from "../../instrumentation/index.js";
import { getInheritedOrGlobal } from "../../util/common.js";
import { deleteLocalFile, ensureDir, privateCacheDir, rmCache } from "../../util/fs/index.js";
import { applySecretsAndVariablesToConfig } from "../../config/secrets.js";
import { clear } from "../../util/http/queue.js";
import { clear as clear$1 } from "../../util/http/throttle.js";
import { removeDanglingContainers } from "../../util/exec/docker/index.js";
import { isCloned } from "../../util/git/index.js";
import { processResult } from "./result.js";
import { addExtractionStats } from "../../instrumentation/reporting.js";
import { detectSemanticCommits } from "../../util/git/semantic.js";
import { addSplit, getSplits, splitInit } from "../../util/split.js";
import { setBranchCache } from "./cache.js";
import { extractRepoProblems } from "./common.js";
import { OnboardingState } from "./onboarding/common.js";
import { configMigration } from "./config-migration/index.js";
import { ensureDependencyDashboard } from "./dependency-dashboard.js";
import handleError from "./error.js";
import { extractDependencies, updateRepo } from "./process/index.js";
import { pruneStaleBranches } from "./finalize/prune.js";
import { finalizeRepo } from "./finalize/index.js";
import { initRepo } from "./init/index.js";
import { ensureOnboardingPr } from "./onboarding/pr/index.js";
//#region lib/workers/repository/index.ts
// istanbul ignore next
async function renovateRepository(repoConfig, canRetry = true) {
	splitInit();
	let repoResult;
	const { config, localDir, error } = await instrument("init", async () => {
		let config = GlobalConfig.set(applySecretsAndVariablesToConfig({
			config: repoConfig,
			deleteVariables: false,
			deleteSecrets: false
		}));
		await removeDanglingContainers();
		setMeta({ repository: config.repository });
		logger.info({ renovateVersion: pkg.version }, "Repository started");
		logger.trace({ config });
		clear();
		clear$1();
		const localDir = GlobalConfig.get("localDir");
		try {
			await ensureDir(localDir);
			logger.debug(`Using localDir: ${localDir}`);
			config = await initRepo(config);
			addSplit("init");
		} catch (err) /* istanbul ignore next */ {
			setMeta({ repository: config.repository });
			const errorRes = await handleError(config, err);
			if ([
				"disabled-by-config",
				"fork",
				"disabled-no-config"
			].includes(errorRes)) await pruneStaleBranches(config, []);
			repoResult = processResult(config, errorRes);
			return {
				config,
				localDir,
				error: err
			};
		}
		return {
			config,
			localDir
		};
	}, { attributes: { [ATTR_RENOVATE_SPLIT]: "init" } });
	if (error === void 0) try {
		const performExtract = config.repoIsOnboarded || !OnboardingState.onboardingCacheValid || OnboardingState.prUpdateRequested;
		const extractResult = performExtract ? await extractDependencies(config) : emptyExtract();
		addExtractionStats(config, extractResult);
		const { branches, branchList, packageFiles } = extractResult;
		if (config.semanticCommits === "auto") config.semanticCommits = await detectSemanticCommits();
		if (GlobalConfig.get("dryRun") !== "lookup" && GlobalConfig.get("dryRun") !== "extract") {
			let res;
			if (config.repoIsOnboarded) {
				addSplit("onboarding");
				res = await instrument("update", () => updateRepo(config, branches), { attributes: { [ATTR_RENOVATE_SPLIT]: "update" } });
				setMeta({ repository: config.repository });
			} else {
				res = await instrument("onboarding", () => ensureOnboardingPr(config, packageFiles, branches), { attributes: { [ATTR_RENOVATE_SPLIT]: "onboarding" } });
				addSplit("onboarding");
			}
			addSplit("update");
			if (performExtract) await setBranchCache(branches);
			if (res === "automerged") {
				if (canRetry) {
					logger.info("Restarting repository job after automerge result");
					return await renovateRepository(repoConfig, false);
				}
				logger.debug(`Automerged but already retried once`);
			} else {
				const configMigrationRes = await configMigration(config, branchList);
				await ensureDependencyDashboard(config, branches, packageFiles, configMigrationRes);
			}
			await finalizeRepo(config, branchList, repoConfig);
			repoResult = processResult(config, res);
		}
		printRepositoryProblems(config.repository);
	} catch (err) /* istanbul ignore next */ {
		setMeta({ repository: config.repository });
		const errorRes = await handleError(config, err);
		if ([
			"disabled-by-config",
			"fork",
			"disabled-no-config"
		].includes(errorRes)) await pruneStaleBranches(config, []);
		repoResult = processResult(config, errorRes);
	}
	else logger.debug({ err: error }, "Skipping the rest to the Renovate run due to error in `init` phase");
	if (localDir && !repoConfig.persistRepoData) try {
		await deleteLocalFile(".");
	} catch (err) /* istanbul ignore if */ {
		logger.warn({ err }, "localDir deletion error");
	}
	try {
		await rmCache(privateCacheDir());
	} catch (err) /* istanbul ignore if */ {
		logger.warn({ err }, "privateCacheDir deletion error");
	}
	const splits = getSplits();
	logger.debug(splits, "Repository timing splits (milliseconds)");
	PackageCacheStats.report();
	DatasourceCacheStats.report();
	HttpStats.report();
	HttpCacheStats.report();
	LookupStats.report();
	GetDatasourceReleasesStats.report();
	ObsoleteCacheHitLogger.report();
	AbandonedPackageStats.report();
	GitOperationStats.report();
	const cloned = isCloned();
	/* v8 ignore next -- coverage not required of these `undefined` checks, as we're happy receiving an `undefined` in the logs */
	logger.info({
		cloned,
		durationMs: splits.total,
		result: repoResult?.res,
		status: repoResult?.status,
		enabled: repoResult?.enabled,
		onboarded: repoResult?.onboarded,
		exitCode: repoResult?.exitCode
	}, "Repository finished");
	resetRepositoryLogLevelRemaps();
	return repoResult;
}
// istanbul ignore next: renovateRepository is ignored
function emptyExtract() {
	return instrument("extract", () => {
		addSplit("extract");
		addSplit("lookup");
		return {
			branches: [],
			branchList: [getInheritedOrGlobal("onboardingBranch")],
			packageFiles: {}
		};
	}, { attributes: { [ATTR_RENOVATE_SPLIT]: "extract" } });
}
function printRepositoryProblems(repository) {
	const repoProblems = extractRepoProblems(repository);
	// v8 ignore else -- only called when the repository logged a problem
	if (repoProblems.size) logger.debug({ repoProblems: Array.from(repoProblems) }, "repository problems");
}
//#endregion
export { printRepositoryProblems, renovateRepository };

//# sourceMappingURL=index.js.map