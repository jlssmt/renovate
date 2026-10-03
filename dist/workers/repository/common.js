import { getProblems } from "../../logger/index.js";
import { emojify } from "../../util/emoji.js";
import { DEBUG, ERROR, FATAL, INFO, TRACE, WARN, nameFromLevel } from "bunyan";
//#region lib/workers/repository/common.ts
/**
* Checks whether a replacement target already exists as a sibling dependency
* in the same package file.
*/
function replacementAlreadyExists(deps, currentDep, newName) {
	return deps.some((sibling) => sibling !== currentDep && (sibling.depName === newName || sibling.packageName === newName));
}
function extractRepoProblems(repository) {
	return new Set(getProblems().filter((problem) => problem.repository === repository && !problem.artifactErrors).map((problem) => `${formatProblemLevel(problem.level)}: ${problem.msg}`));
}
const logLevelEmojis = {
	[TRACE]: ":microscope:",
	[DEBUG]: ":mag:",
	[INFO]: ":information_source:",
	[WARN]: ":warning:",
	[ERROR]: ":x:",
	[FATAL]: ":skull:"
};
function formatProblemLevel(level) {
	const name = nameFromLevel[level].toUpperCase();
	const emojiName = logLevelEmojis[level];
	return `${emojify(emojiName)} ${name}`;
}
//#endregion
export { extractRepoProblems, formatProblemLevel, replacementAlreadyExists };

//# sourceMappingURL=common.js.map