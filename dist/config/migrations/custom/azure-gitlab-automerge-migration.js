import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/azure-gitlab-automerge-migration.ts
var AzureGitLabAutomergeMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = /^azureAutoComplete$|^gitLabAutomerge$/;
	run(value) {
		if (value !== void 0) this.setHard("platformAutomerge", value);
	}
};
//#endregion
export { AzureGitLabAutomergeMigration };

//# sourceMappingURL=azure-gitlab-automerge-migration.js.map