import { GlobalConfig } from "../../global.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { removedPresets } from "../../presets/common.js";
import { isNonEmptyString, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/extends-migration.ts
var ExtendsMigration = class extends AbstractMigration {
	propertyName = "extends";
	run() {
		const value = this.get("extends");
		let newPresets = [];
		if (isString(value)) newPresets = this.normalizePresets([value]);
		if (Array.isArray(value)) newPresets = this.normalizePresets(value);
		this.rewrite(newPresets);
	}
	normalizePresets(presets) {
		return presets.filter(isString).map((preset) => this.normalizePreset(preset)).filter(isNonEmptyString);
	}
	normalizePreset(preset) {
		const migratePresets = GlobalConfig.get("migratePresets");
		if (removedPresets[preset] !== void 0) return removedPresets[preset];
		if (migratePresets?.[preset] !== void 0) return migratePresets?.[preset];
		return preset;
	}
};
//#endregion
export { ExtendsMigration };

//# sourceMappingURL=extends-migration.js.map