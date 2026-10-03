import { AbstractMigration } from "../base/abstract-migration.js";
import { isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/compatibility-migration.ts
var CompatibilityMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "compatibility";
	run(value) {
		if (isObject(value)) this.setSafely("constraints", value);
	}
};
//#endregion
export { CompatibilityMigration };

//# sourceMappingURL=compatibility-migration.js.map