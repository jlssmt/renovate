import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { checkFileContainsDependency, getTerragruntDependencyType } from "./util.js";
import { analyseTerragruntModule, extractTerragruntModule } from "./modules.js";
//#region lib/modules/manager/terragrunt/extract.ts
const dependencyBlockExtractionRegex = regEx(/^\s*(?<type>[a-z_]+)\s+{\s*$/);
const contentCheckList = ["terraform {"];
const includeBlockCheck = regEx(/include\s*(?:".*")?\s*\{/);
function extractPackageFile(content, packageFile) {
	logger.trace({ content }, `terragrunt.extractPackageFile(${packageFile})`);
	if (!checkFileContainsDependency(content, contentCheckList)) {
		if (content.match(includeBlockCheck)) return { deps: [] };
		return null;
	}
	let deps = [];
	try {
		const lines = content.split(newlineRegex);
		for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
			const line = lines[lineNumber];
			const terragruntDependency = dependencyBlockExtractionRegex.exec(line);
			if (terragruntDependency?.groups) {
				logger.trace(`Matched ${terragruntDependency.groups.type} on line ${lineNumber}`);
				const tfDepType = getTerragruntDependencyType(terragruntDependency.groups.type);
				let result = null;
				switch (tfDepType) {
					case "terraform":
						result = extractTerragruntModule(lineNumber, lines);
						break;
					/* istanbul ignore next */
					default: logger.trace(`Could not identify TerragruntDependencyType ${terragruntDependency.groups.type} on line ${lineNumber}.`);
				}
				// v8 ignore else -- only the ignored default case leaves this unset
				if (result) {
					lineNumber = result.lineNumber;
					deps = deps.concat(result.dependencies);
					result = null;
				}
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting terragrunt plugins");
	}
	deps.forEach((dep) => {
		switch (dep.managerData.terragruntDependencyType) {
			case "terraform": analyseTerragruntModule(dep);
		}
		delete dep.managerData;
	});
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map