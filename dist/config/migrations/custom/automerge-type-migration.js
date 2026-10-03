import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/automerge-type-migration.ts
var AutomergeTypeMigration = class extends AbstractMigration {
	propertyName = "automergeType";
	run(value) {
		if (isString(value) && value.startsWith("branch-")) this.rewrite("branch");
	}
};
//#endregion
export { AutomergeTypeMigration };

//# sourceMappingURL=automerge-type-migration.js.map