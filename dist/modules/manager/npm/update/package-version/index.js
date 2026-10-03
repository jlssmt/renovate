import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import semver from "semver";
//#region lib/modules/manager/npm/update/package-version/index.ts
function isMirrorBumpVersion(bumpVersion) {
	return bumpVersion.startsWith("mirror:");
}
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump package.json version");
	let newPjVersion;
	let bumpedContent = content;
	try {
		if (isMirrorBumpVersion(bumpVersion)) {
			const mirrorPackage = bumpVersion.replace("mirror:", "");
			const parsedContent = JSON.parse(content);
			/* v8 ignore next -- needs test */
			newPjVersion = parsedContent.dependencies?.[mirrorPackage] ?? parsedContent.devDependencies?.[mirrorPackage] ?? parsedContent.optionalDependencies?.[mirrorPackage] ?? parsedContent.peerDependencies?.[mirrorPackage];
			if (!newPjVersion) {
				logger.warn({ mirrorPackage }, "bumpVersion mirror package not found");
				return { bumpedContent };
			}
		} else newPjVersion = semver.inc(currentValue, bumpVersion);
		logger.debug(`newPjVersion: ${newPjVersion}`);
		bumpedContent = content.replace(regEx(`(?<version>"version":\\s*")[^"]*`), `$<version>${newPjVersion}`);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("Bumped package.json version");
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

//# sourceMappingURL=index.js.map