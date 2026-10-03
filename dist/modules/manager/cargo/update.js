import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import semver from "semver";
//#region lib/modules/manager/cargo/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump Cargo.toml version");
	let bumpedContent = content;
	if (!semver.valid(currentValue)) {
		logger.warn({ currentValue }, "Unable to bump Cargo.toml version, not a valid semver");
		return { bumpedContent };
	}
	try {
		const newCrateVersion = semver.inc(currentValue, bumpVersion);
		if (!newCrateVersion) throw new Error("semver inc failed");
		logger.debug({ newCrateVersion });
		bumpedContent = content.replace(regEx(`^(?<version>version[ \\t]*=[ \\t]*['"])[^'"]*`, "m"), `$<version>${newCrateVersion}`);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("Bumped Cargo.toml version");
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