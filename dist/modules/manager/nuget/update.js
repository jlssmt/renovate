import { replaceAt } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { findVersion } from "./util.js";
import semver from "semver";
import { XmlDocument } from "xmldoc";
//#region lib/modules/manager/nuget/update.ts
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump project version");
	let bumpedContent = content;
	if (!semver.valid(currentValue)) {
		logger.warn({ currentValue }, "Unable to bump project version, not a valid semver");
		return { bumpedContent };
	}
	try {
		const project = new XmlDocument(content);
		const versionNode = findVersion(project);
		if (!versionNode) {
			logger.warn("Couldn't find Version or VersionPrefix in any PropertyGroup");
			return { bumpedContent };
		}
		const currentProjVersion = versionNode.val;
		if (currentProjVersion !== currentValue) {
			logger.warn({
				currentValue,
				currentProjVersion
			}, "currentValue passed to bumpPackageVersion() doesn't match value found");
			return { bumpedContent };
		}
		const startTagPosition = versionNode.startTagPosition;
		const versionPosition = content.indexOf(currentProjVersion, startTagPosition);
		const newProjVersion = semver.inc(currentValue, bumpVersion);
		if (!newProjVersion) throw new Error("semver inc failed");
		logger.debug(`newProjVersion: ${newProjVersion}`);
		bumpedContent = replaceAt(content, versionPosition, currentValue, newProjVersion);
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