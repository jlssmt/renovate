import { logger } from "../../../../logger/index.js";
import { findLocalSiblingOrParent } from "../../../../util/fs/index.js";
//#region lib/modules/manager/pep621/processors/abstract.ts
var BasePyProjectProcessor = class {
	lockfileName;
	async getLockfiles(_project, packageFile) {
		if (!this.lockfileName) {
			logger.trace({ packageFile }, `No lockfile name defined for ${this.constructor.name}`);
			return [];
		}
		const lockfilePath = await findLocalSiblingOrParent(packageFile, this.lockfileName);
		if (lockfilePath) return [lockfilePath];
		logger.debug({ packageFile }, `No ${this.lockfileName} found`);
		return [];
	}
};
//#endregion
export { BasePyProjectProcessor };

//# sourceMappingURL=abstract.js.map