import { coerceArray } from "../../../util/array.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/file-match-migration.ts
var FileMatchMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "fileMatch";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (isString(value) || isArray(value, isString)) {
			const fileMatch = isArray(value) ? value : [value];
			let managerFilePatterns = coerceArray(this.get("managerFilePatterns"));
			managerFilePatterns = managerFilePatterns.concat(fileMatch.map((match) => `/${match}/`));
			this.setHard("managerFilePatterns", managerFilePatterns);
		}
	}
};
//#endregion
export { FileMatchMigration };

//# sourceMappingURL=file-match-migration.js.map