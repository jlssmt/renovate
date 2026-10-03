import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/separate-multiple-major-migration.ts
var SeparateMultipleMajorMigration = class extends AbstractMigration {
	propertyName = "separateMultipleMajor";
	run() {
		if (this.has("separateMajorReleases")) this.delete();
	}
};
//#endregion
export { SeparateMultipleMajorMigration };

//# sourceMappingURL=separate-multiple-major-migration.js.map