import { logger } from "../../../logger/index.js";
import { checkFileContainsDependency, extractLocksForPackageFile } from "./util.js";
import { resourceExtractors } from "./extractors.js";
import { parseHCL } from "./hcl/index.js";
import { isNullOrUndefined } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extract.ts
async function extractPackageFile(content, packageFile, config) {
	logger.trace({ content }, `terraform.extractPackageFile(${packageFile})`);
	const passedExtractors = [];
	for (const extractor of resourceExtractors) if (checkFileContainsDependency(content, extractor.getCheckList())) passedExtractors.push(extractor);
	if (!passedExtractors.length) {
		logger.debug({ packageFile }, "preflight content check has not found any relevant content");
		return null;
	}
	logger.trace({ packageFile }, `preflight content check passed for extractors: [${passedExtractors.map((value) => value.constructor.name).toString()}]`);
	const dependencies = [];
	const hclMap = await parseHCL(content, packageFile);
	if (isNullOrUndefined(hclMap)) {
		logger.debug({ packageFile }, "failed to parse HCL file");
		return null;
	}
	const locks = await extractLocksForPackageFile(packageFile);
	for (const extractor of passedExtractors) {
		const deps = extractor.extract(hclMap, locks, config);
		dependencies.push(...deps);
	}
	dependencies.forEach((value) => delete value.managerData);
	return dependencies.length ? { deps: dependencies } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map