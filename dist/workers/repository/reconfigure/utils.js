import { logger } from "../../../logger/index.js";
import { parseJson } from "../../../util/common.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { scm } from "../../../modules/platform/scm.js";
import { platform } from "../../../modules/platform/index.js";
import { detectConfigFile } from "../init/merge.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/workers/repository/reconfigure/utils.ts
function getReconfigureBranchName(prefix) {
	return `${prefix}reconfigure`;
}
async function setBranchStatus(branchName, description, state, context) {
	if (!isNonEmptyString(context)) return;
	await platform.setBranchStatus({
		branchName,
		context,
		description,
		state
	});
}
async function getReconfigureConfig(branchName) {
	await scm.checkoutBranch(branchName);
	const configFileName = await detectConfigFile();
	if (configFileName === null) {
		logger.debug("No config file found in reconfigure branch");
		return {
			ok: false,
			errMessage: "Validation Failed - No config file found"
		};
	}
	const configFileRaw = await readLocalFile(configFileName, "utf8");
	if (configFileRaw === null) return {
		ok: false,
		errMessage: "Validation Failed - Invalid config file",
		configFileName
	};
	let configFileParsed;
	try {
		configFileParsed = parseJson(configFileRaw, configFileName);
		if (configFileName === "package.json") configFileParsed = configFileParsed.renovate;
	} catch (err) {
		logger.debug({ err }, "Error while parsing config file");
		return {
			ok: false,
			errMessage: "Validation Failed - Unparsable config file",
			configFileName
		};
	}
	return {
		ok: true,
		config: configFileParsed,
		configFileName
	};
}
//#endregion
export { getReconfigureBranchName, getReconfigureConfig, setBranchStatus };

//# sourceMappingURL=utils.js.map