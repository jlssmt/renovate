import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/include-forks-migration.ts
var IncludeForksMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "includeForks";
	run(value) {
		if (isBoolean(value)) this.setSafely("forkProcessing", value ? "enabled" : "disabled");
	}
};
//#endregion
export { IncludeForksMigration };

//# sourceMappingURL=include-forks-migration.js.map