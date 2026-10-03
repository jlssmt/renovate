import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/update-lock-files-migration.ts
var UpdateLockFilesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "updateLockFiles";
	run(value) {
		if (value === false) this.setSafely("skipArtifactsUpdate", true);
	}
};
//#endregion
export { UpdateLockFilesMigration };

//# sourceMappingURL=update-lock-files-migration.js.map