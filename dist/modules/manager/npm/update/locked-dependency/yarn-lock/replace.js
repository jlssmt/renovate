import { regEx } from "../../../../../../util/regex.js";
import { logger } from "../../../../../../logger/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/yarn-lock/replace.ts
function replaceConstraintVersion(lockFileContent, depName, constraint, newVersion, newConstraint) {
	if (lockFileContent.startsWith("__metadata:")) return lockFileContent;
	const depNameConstraint = `${depName}@${constraint}`;
	const matchString = `((?:^|\n|, )"?${depNameConstraint.replace(regEx(/(?<special>@|\^|\.|\\|\|)/g), "\\$<special>")}(("|",|,)[^\n:]*)?:\n)(.*\n)*?(\\s+dependencies|\n[@a-z])`;
	const matchResult = regEx(matchString).exec(lockFileContent);
	/* v8 ignore next -- needs test */
	if (!matchResult) {
		logger.debug({
			depName,
			constraint,
			newVersion
		}, "Could not find constraint in lock file");
		return lockFileContent;
	}
	let constraintLine = matchResult[1];
	if (newConstraint) {
		const newDepNameConstraint = `${depName}@${newConstraint}`;
		constraintLine = constraintLine.replace(depNameConstraint, newDepNameConstraint);
	}
	return lockFileContent.replace(regEx(matchString), `${constraintLine}  version "${newVersion}"\n$5`);
}
//#endregion
export { replaceConstraintVersion };

//# sourceMappingURL=replace.js.map