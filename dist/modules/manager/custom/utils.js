import { logger } from "../../../logger/index.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
//#region lib/modules/manager/custom/utils.ts
const validMatchFields = [
	"depName",
	"packageName",
	"currentValue",
	"currentDigest",
	"datasource",
	"versioning",
	"extractVersion",
	"registryUrl",
	"depType",
	"indentation"
];
function isValidDependency({ depName, currentValue, currentDigest, packageName, datasource }) {
	return (isNonEmptyStringAndNotWhitespace(depName) || isNonEmptyStringAndNotWhitespace(packageName)) && (isNonEmptyStringAndNotWhitespace(currentDigest) || isNonEmptyStringAndNotWhitespace(currentValue)) && isNonEmptyStringAndNotWhitespace(datasource);
}
function checkIsValidDependency(dep, packageFile, manager) {
	const isValid = isValidDependency(dep);
	if (!isValid) {
		const meta = {
			packageDependency: dep,
			packageFile,
			manager
		};
		logger.trace(meta, "Discovered a package dependency, but it did not pass validation. Discarding");
		return isValid;
	}
	return isValid;
}
//#endregion
export { checkIsValidDependency, isValidDependency, validMatchFields };

//# sourceMappingURL=utils.js.map