import { minimatch } from "../../../util/minimatch.js";
import { matchRegexOrGlob } from "../../../util/string-match.js";
import { logger } from "../../../logger/index.js";
//#region lib/workers/repository/extract/file-match.ts
function getIncludedFiles(fileList, includePaths) {
	if (!includePaths?.length) return [...fileList];
	return fileList.filter((file) => includePaths.some((includePath) => file === includePath || minimatch(includePath, { dot: true }).match(file)));
}
function filterIgnoredFiles(fileList, ignorePaths) {
	if (!ignorePaths?.length) return [...fileList];
	return fileList.filter((file) => !ignorePaths.some((ignorePath) => file.includes(ignorePath) || minimatch(ignorePath, { dot: true }).match(file)));
}
function getFilteredFileList(config, fileList) {
	const { includePaths, ignorePaths } = config;
	let filteredList = getIncludedFiles(fileList, includePaths);
	filteredList = filterIgnoredFiles(filteredList, ignorePaths);
	return filteredList;
}
function getMatchingFiles(config, allFiles) {
	const fileList = getFilteredFileList(config, allFiles);
	const { managerFilePatterns, manager } = config;
	let matchedFiles = [];
	for (const pattern of managerFilePatterns) {
		logger.debug(`Using file pattern: ${pattern} for manager ${manager}`);
		matchedFiles = matchedFiles.concat(fileList.filter((file) => matchRegexOrGlob(file, pattern)));
	}
	return [...new Set(matchedFiles)].sort();
}
//#endregion
export { filterIgnoredFiles, getFilteredFileList, getIncludedFiles, getMatchingFiles };

//# sourceMappingURL=file-match.js.map