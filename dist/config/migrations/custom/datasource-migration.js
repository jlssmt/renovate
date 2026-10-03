import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/datasource-migration.ts
var DatasourceMigration = class extends AbstractMigration {
	propertyName = "datasource";
	run(value) {
		// v8 ignore else -- TODO: add test #40625
		if (isString(value)) {
			const newValue = migrateDatasource(value);
			this.rewrite(newValue);
		}
	}
};
function migrateDatasource(value) {
	switch (value) {
		case "adoptium-java": return "java-version";
		case "dotnet": return "dotnet-version";
		case "node": return "node-version";
	}
	return value;
}
//#endregion
export { DatasourceMigration, migrateDatasource };

//# sourceMappingURL=datasource-migration.js.map