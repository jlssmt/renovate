import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/semantic-commits-migration.ts
var SemanticCommitsMigration = class extends AbstractMigration {
	propertyName = "semanticCommits";
	run(value) {
		if (isBoolean(value)) this.rewrite(value ? "enabled" : "disabled");
		else if (value !== "enabled" && value !== "disabled") this.rewrite("auto");
	}
};
//#endregion
export { SemanticCommitsMigration };

//# sourceMappingURL=semantic-commits-migration.js.map