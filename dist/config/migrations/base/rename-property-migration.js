import { AbstractMigration } from "./abstract-migration.js";
//#region lib/config/migrations/base/rename-property-migration.ts
var RenamePropertyMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName;
	newPropertyName;
	constructor(deprecatedPropertyName, newPropertyName, originalConfig, migratedConfig) {
		super(originalConfig, migratedConfig);
		this.propertyName = deprecatedPropertyName;
		this.newPropertyName = newPropertyName;
	}
	run(value) {
		this.setSafely(this.newPropertyName, value);
	}
};
//#endregion
export { RenamePropertyMigration };

//# sourceMappingURL=rename-property-migration.js.map