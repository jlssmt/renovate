import { GalaxyCollectionDatasource } from "../../datasource/galaxy-collection/index.js";
import { dependencyRegex, galaxyRegEx } from "./util.js";
//#region lib/modules/manager/ansible-galaxy/collections-metadata.ts
function extractCollectionsMetaDataFile(lines) {
	const deps = [];
	let foundDependencyBlock = false;
	for (const line of lines) if (dependencyRegex.exec(line)) foundDependencyBlock = true;
	else if (foundDependencyBlock) {
		const galaxyRegExResult = galaxyRegEx.exec(line);
		if (galaxyRegExResult?.groups) {
			const dep = {
				depType: "galaxy-collection",
				datasource: GalaxyCollectionDatasource.id,
				depName: galaxyRegExResult.groups.packageName,
				currentValue: galaxyRegExResult.groups.version
			};
			deps.push(dep);
		} else break;
	}
	return deps;
}
//#endregion
export { extractCollectionsMetaDataFile };

//# sourceMappingURL=collections-metadata.js.map