import { logger } from "../../../logger/index.js";
//#region lib/modules/manager/copier/update.ts
const updateLine = "#copier updated";
/**
* updateDependency appends a comment line once.
* This is only for the purpose of triggering the artifact update.
* Copier needs to update its answers file itself.
*/
function updateDependency({ fileContent, upgrade }) {
	logger.trace({ upgrade }, `copier.updateDependency()`);
	if (!fileContent.endsWith(updateLine)) {
		logger.debug(`append update line to the fileContent if it hasn't been`);
		return `${fileContent}\n${updateLine}`;
	}
	return fileContent;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map