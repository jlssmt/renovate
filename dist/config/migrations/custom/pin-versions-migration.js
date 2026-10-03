import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/pin-versions-migration.ts
var PinVersionsMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "pinVersions";
	run(value) {
		if (isBoolean(value)) this.setSafely("rangeStrategy", value ? "pin" : "replace");
	}
};
//#endregion
export { PinVersionsMigration };

//# sourceMappingURL=pin-versions-migration.js.map