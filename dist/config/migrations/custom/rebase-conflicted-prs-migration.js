import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/rebase-conflicted-prs-migration.ts
var RebaseConflictedPrs = class extends AbstractMigration {
	deprecated = true;
	propertyName = "rebaseConflictedPrs";
	run(value) {
		if (value === false) this.setSafely("rebaseWhen", "never");
	}
};
//#endregion
export { RebaseConflictedPrs };

//# sourceMappingURL=rebase-conflicted-prs-migration.js.map