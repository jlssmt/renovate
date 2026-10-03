import { AbstractMigration } from "../base/abstract-migration.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/post-update-options-migration.ts
var PostUpdateOptionsMigration = class extends AbstractMigration {
	propertyName = "postUpdateOptions";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (Array.isArray(value)) {
			const newValue = value.filter(isNonEmptyString).filter((option) => option !== "gomodNoMassage");
			this.rewrite(newValue);
		}
	}
};
//#endregion
export { PostUpdateOptionsMigration };

//# sourceMappingURL=post-update-options-migration.js.map