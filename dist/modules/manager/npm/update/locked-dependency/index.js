import { logger } from "../../../../../logger/index.js";
import { api } from "../../../../versioning/semver/index.js";
import { updateLockedDependency as updateLockedDependency$1 } from "./package-lock/index.js";
import { updateLockedDependency as updateLockedDependency$2 } from "./yarn-lock/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/index.ts
async function updateLockedDependency(config) {
	const { currentVersion, newVersion, lockFile } = config;
	if (!(api.isVersion(currentVersion) && api.isVersion(newVersion))) {
		logger.warn({ config }, "Update versions are not valid");
		return { status: "update-failed" };
	}
	if (lockFile.endsWith("package-lock.json")) return await updateLockedDependency$1(config);
	if (lockFile.endsWith("yarn.lock")) return updateLockedDependency$2(config);
	if (lockFile.endsWith("pnpm-lock.yaml")) {
		logger.debug("Cannot patch pnpm lock file directly - falling back to using pnpm");
		return { status: "unsupported" };
	}
	logger.debug(`updateLockedDependency(): unsupported lock file: ${lockFile}`);
	return { status: "update-failed" };
}
//#endregion
export { updateLockedDependency };

//# sourceMappingURL=index.js.map