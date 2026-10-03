import { logger } from "../../../logger/index.js";
import { Json } from "../../../util/schema-utils/index.js";
import { api } from "../../versioning/composer/index.js";
import { Lockfile } from "./schema.js";
//#region lib/modules/manager/composer/update-locked.ts
function updateLockedDependency(config) {
	const { depName, currentVersion, newVersion, lockFile, lockFileContent } = config;
	logger.debug(`composer.updateLockedDependency: ${depName}@${currentVersion} -> ${newVersion} [${lockFile}]`);
	try {
		const lockfile = Json.pipe(Lockfile).parse(lockFileContent);
		if ([...lockfile.packages, ...lockfile.packagesDev].find(({ name, version }) => name === depName && api.equals(version, newVersion))) return { status: "already-updated" };
		return { status: "unsupported" };
	} catch (err) /* istanbul ignore next */ {
		logger.debug({ err }, "composer.updateLockedDependency() error");
		return { status: "update-failed" };
	}
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=update-locked.js.map