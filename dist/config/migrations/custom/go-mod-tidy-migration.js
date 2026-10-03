import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/go-mod-tidy-migration.ts
var GoModTidyMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "gomodTidy";
	run(value) {
		const postUpdateOptions = this.get("postUpdateOptions");
		if (value) {
			const newPostUpdateOptions = Array.isArray(postUpdateOptions) ? postUpdateOptions.concat(["gomodTidy"]) : ["gomodTidy"];
			this.setHard("postUpdateOptions", newPostUpdateOptions);
		}
	}
};
//#endregion
export { GoModTidyMigration };

//# sourceMappingURL=go-mod-tidy-migration.js.map