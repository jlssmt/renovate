import { AbstractMigration } from "../base/abstract-migration.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/match-datasources-migration.ts
var MatchDatasourcesMigration = class extends AbstractMigration {
	propertyName = "matchDatasources";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (Array.isArray(value)) {
			const newValue = value.filter(isNonEmptyString).map((datasource) => {
				switch (datasource) {
					case "adoptium-java": return "java-version";
					case "dotnet": return "dotnet-version";
					case "node": return "node-version";
					default: return datasource;
				}
			});
			this.rewrite(newValue);
		}
	}
};
//#endregion
export { MatchDatasourcesMigration };

//# sourceMappingURL=match-datasources-migration.js.map