import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/recreate-closed-migration.ts
var RecreateClosedMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "recreateClosed";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (isBoolean(value)) this.setSafely("recreateWhen", value ? "always" : "auto");
	}
};
//#endregion
export { RecreateClosedMigration };

//# sourceMappingURL=recreate-closed-migration.js.map