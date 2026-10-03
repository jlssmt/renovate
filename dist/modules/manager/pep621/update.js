import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { inc } from "@renovatebot/pep440";
//#region lib/modules/manager/pep621/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump pyproject.toml version");
	let bumpedContent = content;
	try {
		const newProjectVersion = inc(currentValue, bumpVersion);
		if (!newProjectVersion) throw new Error("pep440 inc failed");
		logger.debug(`newProjectVersion: ${newProjectVersion}`);
		bumpedContent = content.replace(regEx(`^(?<version>version[ \\t]*=[ \\t]*['"])[^'"]*`, "m"), `$<version>${newProjectVersion}`);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("Bumped pyproject.toml version");
	} catch {
		logger.warn({
			content,
			currentValue,
			bumpVersion,
			manager: "pep621"
		}, "Failed to bumpVersion");
	}
	return { bumpedContent };
}
//#endregion
export { bumpPackageVersion };

//# sourceMappingURL=update.js.map