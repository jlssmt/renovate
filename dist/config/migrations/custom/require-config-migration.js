import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/require-config-migration.ts
var RequireConfigMigration = class extends AbstractMigration {
	propertyName = "requireConfig";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (value === false || value === "false") this.rewrite("optional");
		else if (value === true || value === "true") this.rewrite("required");
	}
};
//#endregion
export { RequireConfigMigration };

//# sourceMappingURL=require-config-migration.js.map