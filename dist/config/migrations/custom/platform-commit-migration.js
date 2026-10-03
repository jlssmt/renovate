import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/platform-commit-migration.ts
var PlatformCommitMigration = class extends AbstractMigration {
	propertyName = "platformCommit";
	run(value) {
		if (isBoolean(value)) this.rewrite(value ? "enabled" : "disabled");
	}
};
//#endregion
export { PlatformCommitMigration };

//# sourceMappingURL=platform-commit-migration.js.map