import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { compile } from "../../../util/template/index.js";
import { hash } from "../../../util/hash.js";
import _slugify from "slugify";
import cleanGitRef from "clean-git-ref";
//#region lib/workers/repository/updates/branch-name.ts
const slugify = _slugify;
const MIN_HASH_LENGTH = 6;
const RE_MULTIPLE_DASH = regEx(/--+/g);
const RE_SPECIAL_CHARS_STRICT = regEx(/[`~!@#$%^&*()_=+[\]\\|{};':",.<>?/]/g);
/**
* Clean git branch name
*
* Remove what clean-git-ref fails to:
* - leading dot/leading dot after slash
* - trailing dot
* - whitespace
* - special characters
* - leading or trailing dashes
* - chained dashes(breaks markdown comments) are replaced by single dash
*/
function cleanBranchName(branchName, branchPrefix, branchNameStrict) {
	let cleanedBranchName = branchName;
	let existingBranchPrefix = "";
	if (branchNameStrict) {
		if (cleanedBranchName.startsWith(branchPrefix)) {
			existingBranchPrefix = branchPrefix;
			cleanedBranchName = cleanedBranchName.slice(branchPrefix.length);
		}
		cleanedBranchName = existingBranchPrefix + cleanedBranchName.replace(RE_SPECIAL_CHARS_STRICT, "-");
	}
	return cleanGitRef.clean(cleanedBranchName).replace(regEx(/^\.|\.$/), "").replace(regEx(/\/\./g), "/").replace(regEx(/\s/g), "").replace(regEx(/[[\]?:\\^~<>]/g), "-").replace(regEx(/(?<pre>^|\/)-+/g), "$<pre>").replace(regEx(/-+(?<post>\/|$)/g), "$<post>").replace(RE_MULTIPLE_DASH, "-");
}
function generateBranchName(update) {
	const newMajor = String(update.newMajor);
	const newMinor = String(update.newMinor);
	if (!update.groupName && update.sharedVariableName) {
		logger.debug(`Using sharedVariableName=${update.sharedVariableName} as groupName for depName=${update.depName}`);
		update.groupName = update.sharedVariableName;
	}
	if (update.groupName) {
		if (update.updateType === "replacement") logger.debug({ depName: update.depName }, `Ignoring grouped branch name for ${update.updateType} update`);
		else {
			update.groupName = compile(update.groupName, update);
			logger.trace("Using group branchName template");
			logger.trace(`Dependency ${update.depName} is part of group ${update.groupName}`);
			if (update.groupSlug) update.groupSlug = compile(update.groupSlug, update);
			else update.groupSlug = update.groupName;
			update.groupSlug = slugify(update.groupSlug, { lower: true });
			if (update.updateType === "major" && update.separateMajorMinor) {
				if (update.separateMultipleMajor) update.groupSlug = `major-${newMajor}-${update.groupSlug}`;
				else update.groupSlug = `major-${update.groupSlug}`;
			}
			if (update.updateType === "minor" && update.separateMultipleMinor) update.groupSlug = `minor-${newMajor}.${newMinor}-${update.groupSlug}`;
			if (update.updateType === "patch" && update.separateMinorPatch) update.groupSlug = `patch-${update.groupSlug}`;
			if (update.updateType === "lockFileMaintenance") update.groupSlug = `lock-file-maintenance-${update.groupSlug}`;
			update.branchTopic = update.group.branchTopic ?? update.branchTopic;
			update.branchName = update.group.branchName ?? update.branchName;
		}
	}
	if (update.hashedBranchLength) {
		let hashLength = update.hashedBranchLength - update.branchPrefix.length;
		if (hashLength < MIN_HASH_LENGTH) {
			logger.warn({ minHashLength: MIN_HASH_LENGTH }, "`hashedBranchLength` must allow for at least the minimum hash length in addition to `branchPrefix`. Using the minimum hash length instead.");
			hashLength = MIN_HASH_LENGTH;
		}
		let hashInput = compile(String(update.additionalBranchPrefix ?? ""), update) + compile(String(update.branchTopic ?? ""), update);
		hashInput = compile(hashInput, update);
		hashInput = compile(hashInput, update);
		const hashedInput = hash(hashInput);
		update.branchName = `${update.branchPrefix}${hashedInput.slice(0, hashLength)}`;
	} else {
		update.branchName = compile(update.branchName, update);
		update.branchName = compile(update.branchName, update);
		update.branchName = compile(update.branchName, update);
	}
	update.branchName = cleanBranchName(update.branchName, update.branchPrefix, update.branchNameStrict);
}
//#endregion
export { generateBranchName };

//# sourceMappingURL=branch-name.js.map