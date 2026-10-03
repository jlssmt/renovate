import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { extractCollections } from "./collections.js";
import { extractCollectionsMetaDataFile } from "./collections-metadata.js";
import { extractRoles } from "./roles.js";
//#region lib/modules/manager/ansible-galaxy/extract.ts
function getSliceEndNumber(start, numberOfLines, ...blocks) {
	if (start < 0 || start > numberOfLines - 1) return -1;
	let nearestEnd = numberOfLines;
	for (const blocksKey of blocks) if (start < blocksKey && blocksKey < nearestEnd) nearestEnd = blocksKey;
	return nearestEnd;
}
function extractPackageFile(content, packageFile) {
	logger.trace(`ansible-galaxy.extractPackageFile(${packageFile})`);
	const galaxyFileNameRegEx = regEx(/galaxy\.ya?ml$/);
	const deps = [];
	const lines = content.split(newlineRegex);
	try {
		if (galaxyFileNameRegEx.exec(packageFile)) {
			const galaxyDeps = extractCollectionsMetaDataFile(lines);
			deps.push(...galaxyDeps);
		} else {
			const positions = {
				collections: -1,
				roles: -1
			};
			lines.forEach((line, index) => {
				if (regEx(/^collections:/).exec(line)) positions.collections = index;
				if (regEx(/^roles:/).exec(line)) positions.roles = index;
			});
			if (positions.collections >= 0 || positions.roles >= 0) {
				const collectionLines = lines.slice(positions.collections, getSliceEndNumber(positions.collections, lines.length, positions.roles));
				const collectionDeps = extractCollections(collectionLines);
				deps.push(...collectionDeps);
				const roleLines = lines.slice(positions.roles, getSliceEndNumber(positions.roles, lines.length, positions.collections));
				const roleDeps = extractRoles(roleLines);
				deps.push(...roleDeps);
			} else {
				const galaxyDeps = extractRoles(lines);
				deps.push(...galaxyDeps);
			}
		}
		if (!deps.length) return null;
		return { deps };
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting ansible-galaxy deps");
		return null;
	}
}
//#endregion
export { extractPackageFile, getSliceEndNumber };

//# sourceMappingURL=extract.js.map