import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/rebase-stale-prs-migration.ts
var RebaseStalePrsMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "rebaseStalePrs";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (this.get("rebaseConflictedPrs") !== false) {
			if (isBoolean(value)) this.setSafely("rebaseWhen", value ? "behind-base-branch" : "conflicted");
			if (null === value) this.setSafely("rebaseWhen", "auto");
		}
	}
};
//#endregion
export { RebaseStalePrsMigration };

//# sourceMappingURL=rebase-stale-prs-migration.js.map