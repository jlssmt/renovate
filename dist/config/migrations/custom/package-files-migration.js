import { coerceArray } from "../../../util/array.js";
import { AbstractMigration } from "../base/abstract-migration.js";
import { isArray, isNonEmptyObject, isString } from "@sindresorhus/is";
//#region lib/config/migrations/custom/package-files-migration.ts
var PackageFilesMigration = class extends AbstractMigration {
	deprecated = true;
	propertyName = "packageFiles";
	run(value) {
		const packageRules = coerceArray(this.get("packageRules"));
		// v8 ignore else -- TODO: add test #40625
		if (isArray(value)) {
			const fileList = [];
			for (const packageFile of value)
 // v8 ignore else -- TODO: add test #40625
			if (isNonEmptyObject(packageFile) && "packageFile" in packageFile && isString(packageFile.packageFile)) {
				fileList.push(packageFile.packageFile);
				packageFile.paths = [packageFile.packageFile];
				delete packageFile.packageFile;
				if (Object.keys(packageFile).length > 1) packageRules.push({ ...packageFile });
			} else if (isArray(packageFile, isString)) fileList.push(...packageFile);
			else if (isString(packageFile)) fileList.push(packageFile);
			if (fileList.length) this.setSafely("includePaths", fileList);
			if (packageRules.length) this.setSafely("packageRules", packageRules);
		}
	}
};
//#endregion
export { PackageFilesMigration };

//# sourceMappingURL=package-files-migration.js.map