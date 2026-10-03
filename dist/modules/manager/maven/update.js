import { replaceAt } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { isString } from "@sindresorhus/is";
import semver from "semver";
import { XmlDocument } from "xmldoc";
//#region lib/modules/manager/maven/update.ts
function updateAtPosition(fileContent, upgrade, endingAnchor) {
	const { depName, newName, currentValue, newValue, fileReplacePosition } = upgrade;
	let leftPart = fileContent.slice(0, fileReplacePosition);
	const rightPart = fileContent.slice(fileReplacePosition);
	const versionClosePosition = rightPart.indexOf(endingAnchor);
	let restPart = rightPart.slice(versionClosePosition);
	const versionPart = rightPart.slice(0, versionClosePosition);
	const version = versionPart.trim();
	if (newName) {
		const blockStart = Math.max(leftPart.lastIndexOf("<parent"), leftPart.lastIndexOf("<dependency"), leftPart.lastIndexOf("<plugin"), leftPart.lastIndexOf("<extension"));
		let leftBlock = leftPart.slice(blockStart);
		const blockEnd = Math.min(restPart.indexOf("</parent"), restPart.indexOf("</dependency"), restPart.indexOf("</plugin"), restPart.indexOf("</extension"));
		let rightBlock = restPart.slice(0, blockEnd);
		const [groupId, artifactId] = depName.split(":", 2);
		const [newGroupId, newArtifactId] = newName.split(":", 2);
		if (leftBlock.indexOf("<groupId") > 0) leftBlock = updateValue(leftBlock, "groupId", groupId, newGroupId);
		else rightBlock = updateValue(rightBlock, "groupId", groupId, newGroupId);
		if (leftBlock.indexOf("<artifactId") > 0) leftBlock = updateValue(leftBlock, "artifactId", artifactId, newArtifactId);
		else rightBlock = updateValue(rightBlock, "artifactId", artifactId, newArtifactId);
		leftPart = leftPart.slice(0, blockStart) + leftBlock;
		restPart = rightBlock + restPart.slice(blockEnd);
	} else if (version === newValue) return fileContent;
	if (version === currentValue || upgrade.sharedVariableName) {
		const replacedPart = versionPart.replace(version, newValue);
		return leftPart + replacedPart + restPart;
	}
	if (upgrade.datasource === "docker" || upgrade.datasource === "buildpacks-registry") {
		let replacedPart = version;
		// v8 ignore else -- a buildpack upgrade always carries a current value
		if (currentValue) replacedPart = version.replace(currentValue, newValue);
		if (upgrade.currentDigest && upgrade.newDigest) replacedPart = replacedPart.replace(upgrade.currentDigest, upgrade.newDigest);
		// v8 ignore else -- the replacement above always changes the value here
		if (replacedPart !== version) return leftPart + replacedPart + restPart;
	}
	logger.debug({
		depName,
		version,
		currentValue,
		newValue
	}, "Unknown value");
	return null;
}
function updateDependency({ fileContent, upgrade }) {
	const offset = fileContent.indexOf("<");
	const spaces = fileContent.slice(0, offset);
	const restContent = fileContent.slice(offset);
	const updatedContent = updateAtPosition(restContent, upgrade, "</");
	if (!updatedContent) return null;
	if (updatedContent === restContent) return fileContent;
	return `${spaces}${updatedContent}`;
}
function bumpPackageVersion(content, currentValue, bumpVersion) {
	logger.debug({
		bumpVersion,
		currentValue
	}, "Checking if we should bump pom.xml version");
	let bumpedContent = content;
	if (!semver.valid(currentValue)) {
		logger.warn({ currentValue }, "Unable to bump pom.xml version, not a valid semver");
		return { bumpedContent };
	}
	try {
		const versionNode = new XmlDocument(content).childNamed("version");
		const startTagPosition = versionNode.startTagPosition;
		const versionPosition = content.indexOf(versionNode.val, startTagPosition);
		let newPomVersion = null;
		const currentPrereleaseValue = semver.prerelease(currentValue);
		if (isSnapshot(currentPrereleaseValue)) {
			let releaseType = bumpVersion;
			// v8 ignore else -- a snapshot bump is never already a pre-release type
			if (!bumpVersion.startsWith("pre")) releaseType = `pre${bumpVersion}`;
			newPomVersion = semver.inc(currentValue, releaseType, currentPrereleaseValue.join("."), false);
		} else if (currentPrereleaseValue) newPomVersion = semver.inc(currentValue, bumpVersion);
		else newPomVersion = semver.inc(currentValue, bumpVersion, "SNAPSHOT", false);
		if (!newPomVersion) throw new Error("semver inc failed");
		logger.debug({ newPomVersion });
		bumpedContent = replaceAt(content, versionPosition, currentValue, newPomVersion);
		if (bumpedContent === content) logger.debug("Version was already bumped");
		else logger.debug("pom.xml version bumped");
	} catch {
		logger.warn({
			content,
			currentValue,
			bumpVersion
		}, "Failed to bumpVersion");
	}
	return { bumpedContent };
}
function isSnapshot(prerelease) {
	const lastPart = prerelease?.at(-1);
	return isString(lastPart) && lastPart.endsWith("SNAPSHOT");
}
function updateValue(content, nodeName, oldValue, newValue) {
	const elementStart = content.indexOf(`<${nodeName}`);
	const start = content.indexOf(">", elementStart) + 1;
	const end = content.indexOf(`</${nodeName}`, start);
	const elementContent = content.slice(start, end);
	if (elementContent.trim() === oldValue) return content.slice(0, start) + elementContent.replace(oldValue, newValue) + content.slice(end);
	logger.debug({
		content,
		nodeName,
		oldValue,
		newValue
	}, "Unknown value");
	return content;
}
//#endregion
export { bumpPackageVersion, updateAtPosition, updateDependency };

//# sourceMappingURL=update.js.map