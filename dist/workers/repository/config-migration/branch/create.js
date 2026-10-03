import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { parseJson } from "../../../../util/common.js";
import { readLocalFile } from "../../../../util/fs/index.js";
import { scm } from "../../../../modules/platform/scm.js";
import { getMigrationBranchName } from "../common.js";
import { ConfigMigrationCommitMessageFactory } from "./commit-message.js";
import { MigratedDataFactory, applyPrettierFormatting } from "./migrated-data.js";
//#region lib/workers/repository/config-migration/branch/create.ts
async function createConfigMigrationBranch(config, migratedConfigData) {
	logger.debug("createConfigMigrationBranch()");
	const pJsonMigration = migratedConfigData.filename === "package.json";
	const configFileName = pJsonMigration ? "renovate.json" : migratedConfigData.filename;
	logger.debug("Creating config migration branch");
	const commitMessageFactory = new ConfigMigrationCommitMessageFactory(config, configFileName);
	const commitMessage = commitMessageFactory.getCommitMessage();
	// istanbul ignore if
	if (GlobalConfig.get("dryRun")) {
		logger.info("DRY-RUN: Would commit files to config migration branch");
		return Promise.resolve(null);
	}
	await scm.checkoutBranch(config.defaultBranch);
	const files = [{
		type: "addition",
		path: configFileName,
		contents: await MigratedDataFactory.applyPrettierFormatting(migratedConfigData)
	}];
	if (pJsonMigration) {
		const pJson = parseJson(await readLocalFile("package.json", "utf8"), "package.json");
		if (pJson?.renovate) delete pJson.renovate;
		const pJsonContent = await applyPrettierFormatting("package.json", JSON.stringify(pJson, void 0, migratedConfigData.indent.indent), "json", migratedConfigData.indent);
		files.push({
			type: "addition",
			path: "package.json",
			contents: pJsonContent
		});
	}
	return scm.commitAndPush({
		baseBranch: config.baseBranch,
		branchName: getMigrationBranchName(config),
		files,
		message: commitMessage.toString(),
		platformCommit: config.platformCommit,
		force: true,
		prTitle: commitMessageFactory.getPrTitle()
	});
}
//#endregion
export { createConfigMigrationBranch };

//# sourceMappingURL=create.js.map