import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { extractAllPackageFiles, extractPackageFile, get } from "../../../modules/manager/index.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/workers/repository/extract/manager-files.ts
function massageDepNames(packageFiles) {
	if (packageFiles) {
		for (const packageFile of packageFiles) for (const dep of packageFile.deps) if (dep.packageName && !dep.depName) dep.depName = dep.packageName;
	}
}
async function getManagerPackageFiles(config) {
	const { enabled, manager, fileList } = config;
	logger.trace(`getPackageFiles(${manager})`);
	if (!enabled) {
		logger.debug(`${manager} is disabled`);
		return [];
	}
	// istanbul ignore else
	if (isNonEmptyArray(fileList)) {
		logger.debug(`Matched ${fileList.length} file(s) for manager ${manager}`);
		logger.trace(`Matched ${fileList.length} file(s) for manager ${manager}: ${fileList.join(", ")}`);
	} else return [];
	if (get(manager, "extractAllPackageFiles")) {
		const allPackageFiles = await extractAllPackageFiles(manager, config, fileList);
		massageDepNames(allPackageFiles);
		return allPackageFiles;
	}
	const packageFiles = [];
	for (const packageFile of fileList) {
		const content = await readLocalFile(packageFile, "utf8");
		// istanbul ignore else
		if (content) {
			const res = await extractPackageFile(manager, content, packageFile, config);
			if (res) packageFiles.push({
				...res,
				packageFile
			});
		} else logger.debug(`${packageFile} has no content`);
	}
	massageDepNames(packageFiles);
	return packageFiles;
}
//#endregion
export { getManagerPackageFiles };

//# sourceMappingURL=manager-files.js.map