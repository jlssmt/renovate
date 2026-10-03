import { AbstractMigration } from "../base/abstract-migration.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/config/migrations/custom/suppress-notifications-migration.ts
var SuppressNotificationsMigration = class extends AbstractMigration {
	propertyName = "suppressNotifications";
	run(value) {
		if (isNonEmptyArray(value) && value.includes("prEditNotification")) {
			const newValue = value.filter((item) => item !== "prEditNotification");
			this.rewrite(newValue);
		}
	}
};
//#endregion
export { SuppressNotificationsMigration };

//# sourceMappingURL=suppress-notifications-migration.js.map