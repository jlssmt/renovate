import { logger } from "../../../logger/index.js";
import { MigratedDataFactory } from "./branch/migrated-data.js";
import { checkConfigMigrationBranch } from "./branch/index.js";
import { ensureConfigMigrationPr } from "./pr/index.js";
//#region lib/workers/repository/config-migration/index.ts
async function configMigration(config, branchList) {
	if (config.mode === "silent") {
		logger.debug("Config migration issues are not created, updated or closed when mode=silent");
		return { result: "no-migration" };
	}
	try {
		const migratedConfigData = await MigratedDataFactory.getAsync();
		if (!migratedConfigData) {
			logger.debug("Config does not need migration");
			return { result: "no-migration" };
		}
		const res = await checkConfigMigrationBranch(config, migratedConfigData);
		if (res.result === "no-migration-branch") return { result: "add-checkbox" };
		branchList.push(res.migrationBranch);
		const pr = await ensureConfigMigrationPr(config, migratedConfigData);
		if (!pr) return { result: "add-checkbox" };
		return {
			result: res.result === "migration-branch-exists" ? "pr-exists" : "pr-modified",
			prNumber: pr.number
		};
	} finally {
		MigratedDataFactory.reset();
	}
}
//#endregion
export { configMigration };

//# sourceMappingURL=index.js.map