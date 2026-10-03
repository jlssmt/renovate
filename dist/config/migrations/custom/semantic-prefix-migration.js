import { AbstractMigration } from "../base/abstract-migration.js";
import { isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/semantic-prefix-migration.ts
var SemanticPrefixMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "semanticPrefix";
	run(value) {
		if (isString(value)) {
			const [text] = value.split(":");
			const [type, scope] = text.split("(");
			this.setSafely("semanticCommitType", type);
			this.setSafely("semanticCommitScope", scope ? scope.split(")")[0] : null);
		}
	}
};
//#endregion
export { SemanticPrefixMigration };

//# sourceMappingURL=semantic-prefix-migration.js.map