import { regEx } from "../../../util/regex.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/match-strings-migration.ts
var MatchStringsMigration = class extends AbstractMigration {
	propertyName = "matchStrings";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (Array.isArray(value)) {
			const newValue = value.filter(isNonEmptyString).map((matchString) => matchString.replace(regEx(/\(\?<lookupName>/g), "(?<packageName>"));
			this.rewrite(newValue);
		}
	}
};
//#endregion
export { MatchStringsMigration };

//# sourceMappingURL=match-strings-migration.js.map