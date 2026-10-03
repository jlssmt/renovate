import { coerceArray } from "../../../util/array.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/base-branch-migration.ts
var BaseBranchMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "baseBranch";
	run(value) {
		const baseBranchPatterns = coerceArray(this.get("baseBranchPatterns"));
		if (isArray(value)) this.setHard("baseBranchPatterns", baseBranchPatterns.concat(value));
		if (isString(value)) this.setHard("baseBranchPatterns", baseBranchPatterns.concat([value]));
	}
};
//#endregion
export { BaseBranchMigration };

//# sourceMappingURL=base-branch-migration.js.map