import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/package-name-migration.ts
var PackageNameMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "packageName";
	run(value) {
		this.setSafely("packageNames", [value]);
	}
};
//#endregion
export { PackageNameMigration };

//# sourceMappingURL=package-name-migration.js.map