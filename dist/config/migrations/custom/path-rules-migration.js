import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray } from "@sindresorhus/is";
//#region lib/config/migrations/custom/path-rules-migration.ts
var PathRulesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "pathRules";
	run(value) {
		const packageRules = this.get("packageRules");
		if (isArray(value)) this.setHard("packageRules", isArray(packageRules) ? packageRules.concat(value) : value);
	}
};
//#endregion
export { PathRulesMigration };

//# sourceMappingURL=path-rules-migration.js.map