import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import semver from "semver";
//#region lib/modules/manager/sbt/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump build.sbt version");
	let bumpedContent = content;
	const bumpedVersion = semver.inc(currentValue, bumpVersion);
	if (!bumpedVersion) {
		logger.warn("Version incremental failed");
		return { bumpedContent };
	}
	bumpedContent = content.replace(regEx(/^(?<prefix>version\s*:=\s*).*$/m), `$<prefix>"${bumpedVersion}"`);
	if (bumpedContent === content) logger.debug("Version was already bumped");
	else logger.debug(`Bumped build.sbt version to ${bumpedVersion}`);
	return { bumpedContent };
}
//#endregion
export { bumpPackageVersion };

//# sourceMappingURL=update.js.map