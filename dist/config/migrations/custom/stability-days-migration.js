import { AbstractMigration } from "../base/abstract-migration.js";
import { isInteger } from "@sindresorhus/is";
//#region lib/config/migrations/custom/stability-days-migration.ts
var StabilityDaysMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "stabilityDays";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (isInteger(value)) {
			let newValue;
			switch (value) {
				case 0:
					newValue = null;
					break;
				case 1:
					newValue = "1 day";
					break;
				default: newValue = `${value} days`;
			}
			this.setSafely("minimumReleaseAge", newValue);
		}
	}
};
//#endregion
export { StabilityDaysMigration };

//# sourceMappingURL=stability-days-migration.js.map