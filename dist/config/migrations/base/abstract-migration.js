import { isNullOrUndefined, isString } from "@sindresorhus/is";
//#region lib/config/migrations/base/abstract-migration.ts
var AbstractMigration = class {
	deprecated = false;
	originalConfig;
	migratedConfig;
	constructor(originalConfig, migratedConfig) {
		this.originalConfig = originalConfig;
		this.migratedConfig = migratedConfig;
	}
	get(key) {
		return this.migratedConfig[key] ?? this.originalConfig[key];
	}
	has(key) {
		return key in this.originalConfig;
	}
	setSafely(key, value) {
		if (isNullOrUndefined(this.originalConfig[key]) && isNullOrUndefined(this.migratedConfig[key])) this.migratedConfig[key] = value;
	}
	setHard(key, value) {
		this.migratedConfig[key] = value;
	}
	rewrite(value) {
		if (!isString(this.propertyName)) throw new Error();
		this.setHard(this.propertyName, value);
	}
	delete(property = this.propertyName) {
		if (!isString(property)) throw new Error();
		delete this.migratedConfig[property];
	}
};
//#endregion
export { AbstractMigration };

//# sourceMappingURL=abstract-migration.js.map