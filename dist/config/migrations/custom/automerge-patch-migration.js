import { AbstractMigration } from "../base/abstract-migration.js";
import { isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/automerge-patch-migration.ts
var AutomergePatchMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "automergePatch";
	run(value) {
		const patch = this.get("patch");
		const newPatch = isObject(patch) ? patch : {};
		newPatch.automerge = Boolean(value);
		this.setHard("patch", newPatch);
	}
};
//#endregion
export { AutomergePatchMigration };

//# sourceMappingURL=automerge-patch-migration.js.map