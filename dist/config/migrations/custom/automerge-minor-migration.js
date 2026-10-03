import { AbstractMigration } from "../base/abstract-migration.js";
import { isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/automerge-minor-migration.ts
var AutomergeMinorMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "automergeMinor";
	run(value) {
		const minor = this.get("minor");
		const newMinor = isObject(minor) ? minor : {};
		newMinor.automerge = Boolean(value);
		this.setHard("minor", newMinor);
	}
};
//#endregion
export { AutomergeMinorMigration };

//# sourceMappingURL=automerge-minor-migration.js.map