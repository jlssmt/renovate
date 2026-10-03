import { AbstractMigration } from "../base/abstract-migration.js";
import { isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/automerge-major-migration.ts
var AutomergeMajorMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "automergeMajor";
	run(value) {
		const major = this.get("major");
		const newMajor = isObject(major) ? major : {};
		newMajor.automerge = Boolean(value);
		this.setHard("major", newMajor);
	}
};
//#endregion
export { AutomergeMajorMigration };

//# sourceMappingURL=automerge-major-migration.js.map