import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/branch-prefix-migration.ts
var BranchPrefixMigration = class extends AbstractMigration {
	propertyName = "branchPrefix";
	run(value) {
		if (isString(value) && value.includes("{{")) {
			const templateIndex = value.indexOf(`{{`);
			this.rewrite(value.substring(0, templateIndex));
			this.setHard("additionalBranchPrefix", value.substring(templateIndex));
		}
	}
};
//#endregion
export { BranchPrefixMigration };

//# sourceMappingURL=branch-prefix-migration.js.map