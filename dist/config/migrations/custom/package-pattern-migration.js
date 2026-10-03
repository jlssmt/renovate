import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/package-pattern-migration.ts
var PackagePatternMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "packagePattern";
	run(value) {
		this.setSafely("packagePatterns", [value]);
	}
};
//#endregion
export { PackagePatternMigration };

//# sourceMappingURL=package-pattern-migration.js.map