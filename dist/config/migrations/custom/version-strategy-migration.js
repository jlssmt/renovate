import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/version-strategy-migration.ts
var VersionStrategyMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "versionStrategy";
	run(value) {
		if (value === "widen") this.setSafely("rangeStrategy", "widen");
	}
};
//#endregion
export { VersionStrategyMigration };

//# sourceMappingURL=version-strategy-migration.js.map