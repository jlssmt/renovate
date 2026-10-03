import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/branch-name-migration.ts
var BranchNameMigration = class extends AbstractMigration {
	propertyName = "branchName";
	run(value) {
		if (isString(value) && value.includes("{{managerBranchPrefix}}")) this.rewrite(value.replace("{{managerBranchPrefix}}", "{{additionalBranchPrefix}}"));
	}
};
//#endregion
export { BranchNameMigration };

//# sourceMappingURL=branch-name-migration.js.map