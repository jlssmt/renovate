import { CONFIG_VALIDATION } from "../../../constants/error-messages.js";
import { GlobalConfig } from "../../../config/global.js";
import { getRegexPredicate } from "../../../util/string-match.js";
import { addMeta, logger, removeMeta } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { mergeChildConfig } from "../../../config/utils.js";
import { ATTR_RENOVATE_SPLIT } from "../../../instrumentation/types.js";
import { instrument } from "../../../instrumentation/index.js";
import { resolveConfigPresets } from "../../../config/presets/index.js";
import { getCache } from "../../../util/cache/repository/index.js";
import { getBranchList } from "../../../util/git/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import "../../../config/index.js";
import { addSplit } from "../../../util/split.js";
import { migrateAndValidate } from "../../../config/migrate-validate.js";
import { readDashboardBody } from "../dependency-dashboard.js";
import { extract, lookup, update } from "./extract-update.js";
//#region lib/workers/repository/process/index.ts
async function getBaseBranchConfig(baseBranch, config) {
	logger.debug(`baseBranch: ${baseBranch}`);
	let baseBranchConfig = clone(config);
	if (config.useBaseBranchConfig === "merge" && baseBranch !== config.defaultBranch) {
		logger.debug({ baseBranch }, `Merging config from base branch because useBaseBranchConfig=merge`);
		const configFileName = getCache().configFileName;
		try {
			baseBranchConfig = await platform.getJsonFile(configFileName, config.repository, baseBranch);
			logger.debug({ config: baseBranchConfig }, "Base branch config raw");
		} catch {
			logger.error({
				configFileName,
				baseBranch
			}, `Error fetching config file from base branch - possible config name mismatch between branches?`);
			const error = new Error(CONFIG_VALIDATION);
			error.validationSource = "config";
			error.validationError = "Error fetching config file";
			error.validationMessage = `Error fetching config file \`${configFileName}\` from branch \`${baseBranch}\``;
			throw error;
		}
		baseBranchConfig = await migrateAndValidate(config, baseBranchConfig);
		if (baseBranchConfig.errors?.length) {
			const error = new Error(CONFIG_VALIDATION);
			error.validationSource = configFileName;
			error.validationError = `The renovate configuration file of branch ${baseBranch} contains some invalid settings`;
			error.validationMessage = baseBranchConfig.errors.map((e) => e.message).join(", ");
			throw error;
		}
		({config: baseBranchConfig} = await resolveConfigPresets(baseBranchConfig, config));
		baseBranchConfig = mergeChildConfig(config, baseBranchConfig);
		// istanbul ignore if
		if (config.printConfig) logger.info({ config: baseBranchConfig }, "Base branch config after merge");
		baseBranchConfig.baseBranchPatterns = config.baseBranchPatterns;
		baseBranchConfig.baseBranches = config.baseBranches;
	}
	if (isMultiBaseBranch(config)) {
		baseBranchConfig.branchPrefix += `${baseBranch}-`;
		baseBranchConfig.hasBaseBranches = true;
	}
	baseBranchConfig = mergeChildConfig(baseBranchConfig, { baseBranch });
	return baseBranchConfig;
}
function unfoldBaseBranches(defaultBranch, baseBranchPatterns) {
	const unfoldedList = [];
	const allBranches = getBranchList();
	for (const baseBranchPattern of baseBranchPatterns) {
		const isAllowedPred = getRegexPredicate(baseBranchPattern);
		if (isAllowedPred) {
			const matchingBranches = allBranches.filter(isAllowedPred);
			logger.debug(`baseBranchePatterns regex "${baseBranchPattern}" matches [${matchingBranches.join()}]`);
			unfoldedList.push(...matchingBranches);
		} else if (baseBranchPattern === "$default") {
			logger.debug(`baseBranchPatterns "$default" matches "${defaultBranch}"`);
			unfoldedList.push(defaultBranch);
		} else unfoldedList.push(baseBranchPattern);
	}
	return [...new Set(unfoldedList)];
}
function isMultiBaseBranch(config) {
	if (!config.baseBranchPatterns?.length) return false;
	return config.baseBranchPatterns.length > 1 || config.baseBranchPatterns[0].startsWith("/");
}
async function extractDependencies(config, overwriteCache = true) {
	await readDashboardBody(config);
	let res = {
		branches: [],
		branchList: [],
		packageFiles: {}
	};
	if (GlobalConfig.get("platform") !== "local" && config.baseBranchPatterns?.length) {
		config.baseBranches = unfoldBaseBranches(config.defaultBranch, config.baseBranchPatterns);
		logger.debug({ baseBranches: config.baseBranches }, "baseBranches");
		const extracted = {};
		await instrument("extract", async () => {
			for (const baseBranch of config.baseBranches) {
				addMeta({ baseBranch });
				if (scm.syncForkWithUpstream) await scm.syncForkWithUpstream(baseBranch);
				if (await scm.branchExists(baseBranch)) {
					const baseBranchConfig = await getBaseBranchConfig(baseBranch, config);
					extracted[baseBranch] = await extract(baseBranchConfig, overwriteCache);
				} else logger.warn({ baseBranch }, "Base branch does not exist - skipping");
			}
		}, { attributes: { [ATTR_RENOVATE_SPLIT]: "extract" } });
		addSplit("extract");
		await instrument("lookup", async () => {
			for (const baseBranch of config.baseBranches) if (await scm.branchExists(baseBranch)) {
				addMeta({ baseBranch });
				const baseBranchConfig = await getBaseBranchConfig(baseBranch, config);
				const packageFiles = extracted[baseBranch];
				const baseBranchRes = await lookup(baseBranchConfig, packageFiles);
				res.branches = res.branches.concat(baseBranchRes?.branches);
				res.branchList = res.branchList.concat(baseBranchRes?.branchList);
				if (!res.packageFiles || !Object.keys(res.packageFiles).length) res.packageFiles = baseBranchRes?.packageFiles;
			}
		}, { attributes: { [ATTR_RENOVATE_SPLIT]: "lookup" } });
		removeMeta(["baseBranch"]);
	} else {
		logger.debug("No baseBranches");
		const packageFiles = await instrument("extract", async () => await extract(config, overwriteCache), { attributes: { [ATTR_RENOVATE_SPLIT]: "extract" } });
		addSplit("extract");
		if (GlobalConfig.get("dryRun") === "extract") {
			res.packageFiles = packageFiles;
			logger.info({ packageFiles }, "Extracted dependencies");
			return res;
		}
		res = await instrument("lookup", async () => await lookup(config, packageFiles), { attributes: { [ATTR_RENOVATE_SPLIT]: "lookup" } });
	}
	addSplit("lookup");
	return res;
}
function updateRepo(config, branches) {
	logger.debug("processRepo()");
	return update(config, branches);
}
//#endregion
export { extractDependencies, getBaseBranchConfig, isMultiBaseBranch, updateRepo };

//# sourceMappingURL=index.js.map