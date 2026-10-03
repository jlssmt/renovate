import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/upgrade-in-range-migration.ts
var UpgradeInRangeMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "upgradeInRange";
	run(value) {
		if (value === true) this.setSafely("rangeStrategy", "bump");
	}
};
//#endregion
export { UpgradeInRangeMigration };

//# sourceMappingURL=upgrade-in-range-migration.js.map