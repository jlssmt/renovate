import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/dry-run-migration.ts
var DryRunMigration = class extends AbstractMigration {
	propertyName = "dryRun";
	run(value) {
		if (value === true) this.rewrite("full");
		if (value === false) this.rewrite(null);
	}
};
//#endregion
export { DryRunMigration };

//# sourceMappingURL=dry-run-migration.js.map