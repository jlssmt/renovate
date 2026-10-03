import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/renovate-fork-migration.ts
var RenovateForkMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "renovateFork";
	run(value) {
		if (isBoolean(value)) this.setSafely("forkProcessing", value ? "enabled" : "disabled");
	}
};
//#endregion
export { RenovateForkMigration };

//# sourceMappingURL=renovate-fork-migration.js.map