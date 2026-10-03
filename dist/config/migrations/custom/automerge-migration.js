import { AbstractMigration } from "../base/abstract-migration.js";
import { isObject } from "@sindresorhus/is";
//#region lib/config/migrations/custom/automerge-migration.ts
var AutomergeMigration = class extends AbstractMigration {
	propertyName = "automerge";
	run(value) {
		const patch = this.get("patch");
		const minor = this.get("minor");
		const major = this.get("major");
		const newPatch = isObject(patch) ? patch : {};
		const newMinor = isObject(minor) ? minor : {};
		const newMajor = isObject(major) ? major : {};
		switch (value) {
			case "none":
				this.rewrite(false);
				break;
			case "patch":
				this.delete();
				newPatch.automerge = true;
				newMinor.automerge = false;
				newMajor.automerge = false;
				this.setHard("patch", newPatch);
				this.setHard("minor", newMinor);
				this.setHard("major", newMajor);
				break;
			case "minor":
				this.delete();
				newMinor.automerge = true;
				newMajor.automerge = false;
				this.setHard("minor", newMinor);
				this.setHard("major", newMajor);
				break;
			case "any": this.rewrite(true);
		}
	}
};
//#endregion
export { AutomergeMigration };

//# sourceMappingURL=automerge-migration.js.map