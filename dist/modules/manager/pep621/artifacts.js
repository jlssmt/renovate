import { writeLocalFile } from "../../../util/fs/index.js";
import { processors } from "./processors/index.js";
import { parsePyProject } from "./extract.js";
import { isArray, isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/pep621/artifacts.ts
async function updateArtifacts(updateArtifact) {
	const { packageFileName, newPackageFileContent } = updateArtifact;
	await writeLocalFile(packageFileName, newPackageFileContent);
	const project = parsePyProject(newPackageFileContent, packageFileName);
	if (isNullOrUndefined(project)) return [{ artifactError: { stderr: "Failed to parse new package file content" } }];
	const result = [];
	for (const processor of processors) {
		const artifactUpdates = await processor.updateArtifacts(updateArtifact, project);
		if (isArray(artifactUpdates)) result.push(...artifactUpdates);
	}
	return result.length > 0 ? result : null;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map