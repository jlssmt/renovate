import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/separate-major-release-migration.ts
var SeparateMajorReleasesMigration = class extends AbstractMigration {
	propertyName = "separateMajorReleases";
	run(value) {
		this.setSafely("separateMajorMinor", value);
	}
};
//#endregion
export { SeparateMajorReleasesMigration };

//# sourceMappingURL=separate-major-release-migration.js.map