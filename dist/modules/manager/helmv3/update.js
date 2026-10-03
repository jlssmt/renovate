import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import semver from "semver";
//#region lib/modules/manager/helmv3/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump Chart.yaml version");
	let newChartVersion;
	let bumpedContent = content;
	try {
		newChartVersion = semver.inc(currentValue, bumpVersion);
		if (!newChartVersion) throw new Error("semver inc failed");
		logger.debug(`newChartVersion: ${newChartVersion}`);
		bumpedContent = content.replace(regEx(`^(?<version>version:\\s*).*$`, "m"), `$<version>${newChartVersion}`);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("Bumped Chart.yaml version");
	} catch {
		logger.warn({
			content,
			currentValue,
			bumpVersion
		}, "Failed to bumpVersion");
	}
	return { bumpedContent };
}
//#endregion
export { bumpPackageVersion };

//# sourceMappingURL=update.js.map