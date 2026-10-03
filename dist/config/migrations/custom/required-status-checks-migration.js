import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/required-status-checks-migration.ts
var RequiredStatusChecksMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "requiredStatusChecks";
	run(value) {
		if (value === null) this.setSafely("ignoreTests", true);
	}
};
//#endregion
export { RequiredStatusChecksMigration };

//# sourceMappingURL=required-status-checks-migration.js.map