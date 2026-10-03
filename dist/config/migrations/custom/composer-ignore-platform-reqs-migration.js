import { AbstractMigration } from "../base/abstract-migration.js";
import { isBoolean } from "@sindresorhus/is";
//#region lib/config/migrations/custom/composer-ignore-platform-reqs-migration.ts
var ComposerIgnorePlatformReqsMigration = class extends AbstractMigration {
	propertyName = "composerIgnorePlatformReqs";
	run(value) {
		if (isBoolean(value)) this.rewrite(value ? [] : null);
	}
};
//#endregion
export { ComposerIgnorePlatformReqsMigration };

//# sourceMappingURL=composer-ignore-platform-reqs-migration.js.map