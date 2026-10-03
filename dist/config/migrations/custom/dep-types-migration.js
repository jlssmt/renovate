import { coerceArray } from "../../../util/array.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isNonEmptyObject, isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/dep-types-migration.ts
var DepTypesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = /^(?:(?:d|devD|optionalD|peerD)ependencies|engines|depTypes)$/;
	run(value, key) {
		const packageRules = coerceArray(this.get("packageRules"));
		if (isNonEmptyObject(value) && !isArray(value)) packageRules.push({
			matchDepTypes: [key],
			...value
		});
		if (isArray(value)) {
			for (const depType of value) if (isObject(depType) && !isArray(depType)) {
				const depTypeName = depType.depType;
				if (depTypeName) {
					delete depType.depType;
					depType.matchDepTypes = [depTypeName];
					packageRules.push({ ...depType });
				}
			}
		}
		if (packageRules.length) this.setHard("packageRules", packageRules);
	}
};
//#endregion
export { DepTypesMigration };

//# sourceMappingURL=dep-types-migration.js.map