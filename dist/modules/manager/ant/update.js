import { logger } from "../../../logger/index.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/ant/update.ts
/** For external .properties files: updateDependency is necessary because extractPackageFile can't reconstruct dep metadata from a .properties file alone */
function updateDependency({ fileContent, upgrade }) {
	const { depName, currentValue, newValue, fileReplacePosition } = upgrade;
	if (isNullOrUndefined(fileReplacePosition)) {
		logger.debug({ depName }, "No fileReplacePosition for ant dependency");
		return null;
	}
	const leftPart = fileContent.slice(0, fileReplacePosition);
	const rightPart = fileContent.slice(fileReplacePosition);
	let endIndex;
	const quoteChar = leftPart.at(-1);
	if (quoteChar === "\"" || quoteChar === "'") endIndex = rightPart.indexOf(quoteChar);
	else {
		const newlineIndex = rightPart.indexOf("\n");
		const lineEnd = newlineIndex === -1 ? rightPart.length : newlineIndex;
		const nearestQuote = [rightPart.indexOf("\""), rightPart.indexOf("'")].filter((i) => i !== -1 && i < lineEnd);
		if (nearestQuote.length > 0) {
			const quoteEnd = Math.min(...nearestQuote);
			const colonIndex = rightPart.indexOf(":");
			endIndex = colonIndex !== -1 && colonIndex < quoteEnd ? colonIndex : quoteEnd;
		} else endIndex = lineEnd;
	}
	const currentFound = rightPart.slice(0, endIndex);
	if (currentFound === newValue) return fileContent;
	if (currentFound === currentValue || upgrade.sharedVariableName) return `${leftPart}${newValue}${rightPart.slice(endIndex)}`;
	logger.debug({
		depName,
		currentFound,
		currentValue,
		newValue
	}, "ant: unexpected value at fileReplacePosition");
	return null;
}
//#endregion
export { updateDependency };

//# sourceMappingURL=update.js.map