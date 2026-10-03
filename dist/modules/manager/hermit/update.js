import { logger } from "../../../logger/index.js";
//#region lib/modules/manager/hermit/update.ts
const updateLine = "#hermit updated";
/**
* updateDependency appends a comment line once.
* This is only for the purpose of triggering the artifact update
* Hermit doesn't have a package file to update like other package managers.
*/
function updateDependency({ fileContent, upgrade }) {
	logger.trace({ upgrade }, `hermit.updateDependency()`);
	if (!fileContent.endsWith(updateLine)) {
		logger.debug(`append update line to the fileContent if it hasn't been`);
		return `${fileContent}\n${updateLine}`;
	}
	return fileContent;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map