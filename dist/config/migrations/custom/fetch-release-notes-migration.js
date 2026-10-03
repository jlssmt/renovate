import { RenamePropertyMigration } from "../base/rename-property-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/fetch-release-notes-migration.ts
var FetchReleaseNotesMigration = class extends RenamePropertyMigration {
	constructor(originalConfig, migratedConfig) {
		super("fetchReleaseNotes", "fetchChangeLogs", originalConfig, migratedConfig);
	}
	run(value) {
		let newValue = value;
		if (isBoolean(value)) newValue = value ? "pr" : "off";
		super.run(newValue);
	}
};
//#endregion
export { FetchReleaseNotesMigration };

//# sourceMappingURL=fetch-release-notes-migration.js.map