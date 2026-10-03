import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { applySecretsAndVariablesToConfig } from "../../../config/secrets.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { getBranchCommit } from "../../../util/git/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import { mergeRenovateConfig } from "../init/merge.js";
import { mergeInheritedConfig } from "../init/inherited.js";
import { extractDependencies } from "../process/index.js";
import { ensureReconfigurePrComment } from "./comment.js";
import { deleteReconfigureBranchCache, setReconfigureBranchCache } from "./reconfigure-cache.js";
import { getReconfigureBranchName, getReconfigureConfig, setBranchStatus } from "./utils.js";
import { validateReconfigureBranch } from "./validate.js";
//#region lib/workers/repository/reconfigure/index.ts
async function checkReconfigureBranch(config, repoConfig) {
	logger.debug("checkReconfigureBranch()");
	if (GlobalConfig.get("platform") === "local") {
		logger.debug("Not attempting to reconfigure when running with local platform");
		return;
	}
	const context = config.statusCheckNames?.configValidation;
	const reconfigureBranch = getReconfigureBranchName(config.branchPrefix);
	if (!await scm.branchExists(reconfigureBranch)) {
		logger.debug({ reconfigureBranch }, "No reconfigure branch found");
		deleteReconfigureBranchCache();
		return;
	}
	const existingPr = await platform.findPr({
		branchName: reconfigureBranch,
		state: "open",
		includeOtherAuthors: true,
		targetBranch: config.defaultBranch
	});
	const branchSha = getBranchCommit(reconfigureBranch);
	const reconfigureCache = getCache().reconfigureBranchCache;
	if (reconfigureCache?.extractResult) {
		reconfigureCache.extractionSucceeded = true;
		delete reconfigureCache.extractResult;
	}
	if (reconfigureCache?.reconfigureBranchSha === branchSha && (!existingPr || reconfigureCache.extractionSucceeded)) {
		logger.debug("Skipping validation check as branch sha is unchanged");
		return;
	}
	const result = await getReconfigureConfig(reconfigureBranch);
	if (!result.ok) {
		await setBranchStatus(reconfigureBranch, result.errMessage, "red", context);
		setReconfigureBranchCache(branchSha, false);
		await scm.checkoutBranch(config.defaultBranch);
		return;
	}
	if (!await validateReconfigureBranch(config, result.config, result.configFileName, existingPr)) {
		logger.debug("Found errors in reconfigure config. Skipping dependencies extraction");
		await scm.checkoutBranch(config.defaultBranch);
		return;
	}
	if (!existingPr) {
		logger.debug("No reconfigure pr found. Skipping dependencies extraction");
		await scm.checkoutBranch(config.defaultBranch);
		return;
	}
	let extractResult;
	let newConfig = GlobalConfig.set(applySecretsAndVariablesToConfig({ config: repoConfig }));
	newConfig.baseBranch = config.defaultBranch;
	newConfig.repoIsOnboarded = true;
	newConfig.errors = [];
	newConfig.warnings = [];
	try {
		newConfig = await mergeInheritedConfig(newConfig);
		newConfig = await mergeRenovateConfig(newConfig, reconfigureBranch);
		await scm.checkoutBranch(config.defaultBranch);
		extractResult = await extractDependencies(newConfig, false);
	} catch (err) {
		logger.debug({ err }, "Error while extracting dependencies using the reconfigure config");
		setReconfigureBranchCache(branchSha, true);
		await scm.checkoutBranch(config.defaultBranch);
		return;
	}
	const commentEnsured = await ensureReconfigurePrComment(newConfig, extractResult.packageFiles, extractResult.branches, reconfigureBranch, existingPr);
	await setBranchStatus(reconfigureBranch, "Validation Successful", "green", context);
	setReconfigureBranchCache(branchSha, true, commentEnsured);
	await scm.checkoutBranch(config.defaultBranch);
}
//#endregion
export { checkReconfigureBranch };

//# sourceMappingURL=index.js.map