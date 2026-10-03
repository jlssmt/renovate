import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/trust-level-migration.ts
var TrustLevelMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "trustLevel";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (value === "high") {
			this.setSafely("allowCustomCrateRegistries", true);
			this.setSafely("allowScripts", true);
			this.setSafely("exposeAllEnv", true);
		}
	}
};
//#endregion
export { TrustLevelMigration };

//# sourceMappingURL=trust-level-migration.js.map