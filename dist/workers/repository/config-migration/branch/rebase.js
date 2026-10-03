import { GlobalConfig } from "../../../../config/global.js";
import { quickStringify } from "../../../../util/stringify.js";
import { logger } from "../../../../logger/index.js";
import { getFile } from "../../../../util/git/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { getMigrationBranchName } from "../common.js";
import { ConfigMigrationCommitMessageFactory } from "./commit-message.js";
import { MigratedDataFactory } from "./migrated-data.js";
import JSON5 from "json5";
//#region lib/workers/repository/config-migration/branch/rebase.ts
async function rebaseMigrationBranch(config, migratedConfigData) {
	logger.debug("Checking if migration branch needs rebasing");
	const baseBranch = config.defaultBranch;
	const branchName = getMigrationBranchName(config);
	const configFileName = migratedConfigData.filename;
	let contents = migratedConfigData.content;
	const existingContents = await getFile(configFileName, branchName);
	if (jsonStripWhitespaces(contents) === jsonStripWhitespaces(existingContents)) {
		logger.debug("Migration branch is up to date");
		return null;
	}
	logger.debug("Rebasing migration branch");
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would rebase files in migration branch");
		return null;
	}
	const commitMessageFactory = new ConfigMigrationCommitMessageFactory(config, configFileName);
	const commitMessage = commitMessageFactory.getCommitMessage();
	await scm.checkoutBranch(baseBranch);
	contents = await MigratedDataFactory.applyPrettierFormatting(migratedConfigData);
	return scm.commitAndPush({
		baseBranch: config.baseBranch,
		branchName,
		files: [{
			type: "addition",
			path: configFileName,
			contents
		}],
		message: commitMessage.toString(),
		platformCommit: config.platformCommit,
		prTitle: commitMessageFactory.getPrTitle()
	});
}
/**
* @param json a JSON string
* @return a minimal json string. i.e. does not contain any formatting/whitespaces
*/
function jsonStripWhitespaces(json) {
	if (!json) return null;
	/**
	* JSON.stringify(value, replacer, space):
	* If "space" is anything other than a string or number —
	* for example, is null or not provided — no white space is used.
	*
	* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#parameters
	*/
	// v8 ignore next -- JSON5 output is always serializable back to JSON
	return quickStringify(JSON5.parse(json)) ?? 
	/* istanbul ignore next: should never happen */ null;
}
//#endregion
export { jsonStripWhitespaces, rebaseMigrationBranch };

//# sourceMappingURL=rebase.js.map