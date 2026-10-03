import { AbstractMigration } from "../base/abstract-migration.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/config/migrations/custom/custom-managers-migration.ts
var CustomManagersMigration = class extends AbstractMigration {
	propertyName = "customManagers";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (isNonEmptyArray(value)) {
			const customManagers = value.map((mgr) => {
				if (mgr.customType) return mgr;
				return Object.assign({ customType: "regex" }, mgr);
			});
			this.rewrite(customManagers);
		}
	}
};
//#endregion
export { CustomManagersMigration };

//# sourceMappingURL=custom-managers-migration.js.map