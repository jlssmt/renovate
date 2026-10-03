import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { BatectConfig } from "./schema.js";
import upath from "upath";
//#region lib/modules/manager/batect/extract.ts
function extractPackageFile(content, packageFile) {
	logger.trace(`batect.extractPackageFile(${packageFile})`);
	try {
		const { imageDependencies, bundleDependencies, fileIncludes } = BatectConfig.parse(content);
		const deps = [...imageDependencies, ...bundleDependencies];
		const dirName = upath.dirname(packageFile);
		return {
			deps,
			referencedConfigFiles: fileIncludes.map((file) => upath.join(dirName, file))
		};
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Extracting dependencies from Batect configuration file failed");
		return null;
	}
}
async function extractAllPackageFiles(config, packageFiles) {
	const filesToExamine = new Set(packageFiles);
	const filesAlreadyExamined = /* @__PURE__ */ new Set();
	const results = [];
	while (filesToExamine.size > 0) {
		const packageFile = filesToExamine.values().next().value;
		filesToExamine.delete(packageFile);
		filesAlreadyExamined.add(packageFile);
		const result = extractPackageFile(await readLocalFile(packageFile, "utf8"), packageFile);
		if (result !== null) {
			result.referencedConfigFiles.forEach((f) => {
				if (!filesAlreadyExamined.has(f) && !filesToExamine.has(f)) filesToExamine.add(f);
			});
			results.push({
				packageFile,
				deps: result.deps
			});
		}
	}
	return results;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map