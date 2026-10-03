import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/ignore-node-modules-migration.ts
var IgnoreNodeModulesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "ignoreNodeModules";
	run(value) {
		this.setSafely("ignorePaths", value ? ["node_modules/"] : []);
	}
};
//#endregion
export { IgnoreNodeModulesMigration };

//# sourceMappingURL=ignore-node-modules-migration.js.map