import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray } from "@sindresorhus/is";
//#region lib/config/migrations/custom/packages-migration.ts
var PackagesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "packages";
	run(value) {
		const packageRules = this.get("packageRules");
		let newPackageRules = isArray(packageRules) ? packageRules : [];
		if (isArray(value)) newPackageRules = newPackageRules.concat(value);
		this.setHard("packageRules", newPackageRules);
	}
};
//#endregion
export { PackagesMigration };

//# sourceMappingURL=packages-migration.js.map