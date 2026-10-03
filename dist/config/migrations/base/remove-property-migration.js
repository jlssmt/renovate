import { AbstractMigration } from "./abstract-migration.js";
//#region lib/config/migrations/base/remove-property-migration.ts
var RemovePropertyMigration = class extends AbstractMigration {
	propertyName;
	constructor(propertyName, originalConfig, migratedConfig) {
		super(originalConfig, migratedConfig);
		this.propertyName = propertyName;
	}
	run() {
		this.delete(this.propertyName);
	}
};
//#endregion
export { RemovePropertyMigration };

//# sourceMappingURL=remove-property-migration.js.map