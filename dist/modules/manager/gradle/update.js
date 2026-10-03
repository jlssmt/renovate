import { logger } from "../../../logger/index.js";
import { versionLikeSubstring } from "./utils.js";
//#region lib/modules/manager/gradle/update.ts
function updateDependency({ fileContent, upgrade }) {
	const { depName, currentValue, newValue, managerData, updateType } = upgrade;
	if (updateType === "replacement") {
		logger.warn("gradle manager does not support replacement updates yet");
		return null;
	}
	const offset = managerData.fileReplacePosition;
	const leftPart = fileContent.slice(0, offset);
	const rightPart = fileContent.slice(offset);
	const version = versionLikeSubstring(rightPart);
	if (version) {
		const versionClosePosition = version.length;
		const restPart = rightPart.slice(versionClosePosition);
		if (version === newValue) return fileContent;
		if (version === currentValue || upgrade.sharedVariableName) return `${leftPart}${newValue}${restPart}`;
		logger.debug({
			depName,
			version,
			currentValue,
			newValue
		}, "Unknown value");
	} else logger.debug({
		depName,
		currentValue,
		newValue
	}, "Wrong offset");
	return null;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map