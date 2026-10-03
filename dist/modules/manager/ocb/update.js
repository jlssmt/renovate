import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { inc } from "semver";
//#region lib/modules/manager/ocb/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump OCB version");
	let bumpedContent = content;
	try {
		const newProjectVersion = inc(currentValue, bumpVersion);
		if (!newProjectVersion) throw new Error("semver inc failed");
		logger.debug(`newProjectVersion: ${newProjectVersion}`);
		bumpedContent = content.replace(regEx(/\b(?<version>version:\s+["']?)(?<currentValue>[^'"\s]*)/), `$<version>${newProjectVersion}`);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("Bumped OCB version");
	} catch {
		logger.warn({
			content,
			currentValue,
			bumpVersion,
			manager: "ocb"
		}, "Failed to bumpVersion");
	}
	return { bumpedContent };
}
//#endregion
export { bumpPackageVersion };

//# sourceMappingURL=update.js.map