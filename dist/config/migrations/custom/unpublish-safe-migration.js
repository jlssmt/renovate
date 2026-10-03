import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/unpublish-safe-migration.ts
var UnpublishSafeMigration = class UnpublishSafeMigration extends AbstractMigration {
	static SUPPORTED_VALUES = [
		":unpublishSafe",
		"default:unpublishSafe",
		"npm:unpublishSafe",
		"security:minimumReleaseAgeNpm"
	];
	deprecated = true;
	propertyName = "unpublishSafe";
	run(value) {
		const extendsValue = this.get("extends");
		const newExtendsValue = Array.isArray(extendsValue) ? extendsValue : [];
		if (value === true) {
			if (isString(extendsValue)) newExtendsValue.push(extendsValue);
			if (newExtendsValue.every((item) => !this.isSupportedValue(item))) newExtendsValue.push("security:minimumReleaseAgeNpm");
			this.setHard("extends", newExtendsValue.map((item) => {
				if (this.isSupportedValue(item)) return "security:minimumReleaseAgeNpm";
				return item;
			}));
		}
	}
	isSupportedValue(value) {
		return UnpublishSafeMigration.SUPPORTED_VALUES.includes(value);
	}
};
//#endregion
export { UnpublishSafeMigration };

//# sourceMappingURL=unpublish-safe-migration.js.map