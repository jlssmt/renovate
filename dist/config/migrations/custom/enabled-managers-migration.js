import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/enabled-managers-migration.ts
var EnabledManagersMigration = class extends AbstractMigration {
	propertyName = "enabledManagers";
	run(value) {
		if (!isArray(value, isString)) return;
		const newValue = value.map((manager) => {
			switch (manager) {
				case "yarn": return "npm";
				case "regex": return "custom.regex";
				case "renovate-config-presets": return "renovate-config";
				default: return manager;
			}
		});
		this.rewrite(newValue);
	}
};
//#endregion
export { EnabledManagersMigration };

//# sourceMappingURL=enabled-managers-migration.js.map