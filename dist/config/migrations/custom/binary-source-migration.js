import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/binary-source-migration.ts
var BinarySourceMigration = class extends AbstractMigration {
	propertyName = "binarySource";
	run(value) {
		if (value === "auto") this.rewrite("global");
	}
};
//#endregion
export { BinarySourceMigration };

//# sourceMappingURL=binary-source-migration.js.map