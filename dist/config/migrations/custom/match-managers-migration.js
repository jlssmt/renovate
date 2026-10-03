import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/match-managers-migration.ts
var MatchManagersMigration = class extends AbstractMigration {
	propertyName = "matchManagers";
	run(value) {
		if (!isArray(value, isString)) return;
		const newValue = value.map((manager) => {
			switch (manager) {
				case "regex": return "custom.regex";
				case "renovate-config-presets": return "renovate-config";
				default: return manager;
			}
		});
		this.rewrite(newValue);
	}
};
//#endregion
export { MatchManagersMigration };

//# sourceMappingURL=match-managers-migration.js.map