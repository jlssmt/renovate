import { coerceObject } from "../../../util/object.js";
import { AbstractMigration } from "../base/abstract-migration.js";
//#region lib/config/migrations/custom/node-migration.ts
var NodeMigration = class extends AbstractMigration {
	propertyName = "node";
	run(value) {
		const node = this.get("node");
		// v8 ignore else -- TODO: add test #40625
		if (value.enabled === true) {
			delete node.enabled;
			const travis = coerceObject(this.get("travis"));
			travis.enabled = true;
			if (Object.keys(node).length) this.rewrite(node);
			else this.delete("node");
			this.setSafely("travis", travis);
		}
	}
};
//#endregion
export { NodeMigration };

//# sourceMappingURL=node-migration.js.map