import { logger } from "../../../logger/index.js";
import { isValidDependency } from "../custom/utils.js";
import { GolangVersionDatasource } from "../../datasource/golang-version/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { PythonVersionDatasource } from "../../datasource/python-version/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { getDep as getDep$1 } from "../dockerfile/extract.js";
import { DevContainerFile } from "./schema.js";
//#region lib/modules/manager/devcontainer/extract.ts
function extractPackageFile(content, packageFile, extractConfig) {
	try {
		const file = DevContainerFile.parse(content);
		const deps = [];
		const imageDep = getDep(file?.image ?? null, packageFile, extractConfig.registryAliases);
		if (imageDep) {
			imageDep.depType = "image";
			deps.push(imageDep);
		} else logger.trace({ packageFile }, "No image defined in dev container JSON file.");
		const features = file.features;
		if (features) for (const [feature, value] of Object.entries(features)) {
			const featureDep = getDep(feature, packageFile, extractConfig.registryAliases);
			if (featureDep) {
				featureDep.depType = "feature";
				featureDep.pinDigests = false;
				deps.push(featureDep);
				let dep;
				switch (featureDep.depName) {
					case "ghcr.io/devcontainers/features/node":
						dep = {
							depName: "node",
							datasource: NodeVersionDatasource.id,
							currentValue: value.version
						};
						break;
					case "ghcr.io/devcontainers/features/go":
						dep = {
							depName: "go",
							datasource: GolangVersionDatasource.id,
							currentValue: value.version
						};
						break;
					case "ghcr.io/devcontainers/features/python":
						dep = {
							depName: "python",
							datasource: PythonVersionDatasource.id,
							currentValue: value.version
						};
						break;
					case "ghcr.io/devcontainers/features/ruby":
						dep = {
							depName: "ruby",
							datasource: RubyVersionDatasource.id,
							currentValue: value.version
						};
						break;
					default: continue;
				}
				if (!value.version) dep.skipReason = "unspecified-version";
				deps.push(dep);
				continue;
			}
			logger.trace({
				feature,
				packageFile
			}, "Skipping invalid dependency in dev container JSON file.");
		}
		if (deps.length < 1) {
			logger.trace({ packageFile }, "No dependencies to process for dev container JSON file.");
			return null;
		}
		return { deps };
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Error extracting dev container JSON file.");
		return null;
	}
}
function getDep(subject, packageFile, registryAliases) {
	if (!subject) return null;
	const dep = getDep$1(subject, true, registryAliases);
	if (!isValidDependency(dep)) {
		logger.trace({
			subject,
			packageFile
		}, "Skipping invalid docker dependency in dev container JSON file.");
		return null;
	}
	return dep;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map