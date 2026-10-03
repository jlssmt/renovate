import { logger } from "../../../logger/index.js";
import { massage, parse } from "../../../util/toml.js";
import { id } from "../../versioning/pep440/index.js";
import { PythonVersionDatasource } from "../../datasource/python-version/index.js";
import { PyProject } from "./schema.js";
import { processors } from "./processors/index.js";
//#region lib/modules/manager/pep621/extract.ts
function parsePyProject(content, packageFile) {
	try {
		const jsonMap = parse(massage(content));
		return PyProject.parse(jsonMap);
	} catch (err) {
		logger.debug({
			packageFile,
			err
		}, `Failed to parse and validate pyproject file`);
		return null;
	}
}
async function extractPackageFile(content, packageFile, _config) {
	logger.trace(`pep621.extractPackageFile(${packageFile})`);
	const def = parsePyProject(content, packageFile);
	if (!def) return null;
	const deps = [];
	const pythonConstraint = def.project?.["requires-python"];
	const extractedConstraints = {};
	if (pythonConstraint) {
		extractedConstraints.python = pythonConstraint;
		deps.push({
			packageName: "python",
			depType: "requires-python",
			currentValue: pythonConstraint,
			commitMessageTopic: "Python",
			datasource: PythonVersionDatasource.id,
			versioning: id
		});
	}
	const projectDependencies = def.project?.dependencies;
	if (projectDependencies) deps.push(...projectDependencies);
	deps.push(...def["dependency-groups"]);
	const projectOptionalDependencies = def.project?.["optional-dependencies"];
	if (projectOptionalDependencies) deps.push(...projectOptionalDependencies);
	const buildSystemRequires = def["build-system"]?.requires;
	if (buildSystemRequires) deps.push(...buildSystemRequires);
	let processedDeps = deps;
	const lockFiles = [];
	for (const processor of processors) {
		processedDeps = processor.process(def, processedDeps);
		processedDeps = await processor.extractLockedVersions(def, processedDeps, packageFile);
		const processedLockFiles = await processor.getLockfiles(def, packageFile);
		lockFiles.push(...processedLockFiles);
	}
	const packageFileVersion = def.project?.version;
	return processedDeps.length || lockFiles.length ? {
		extractedConstraints,
		deps: processedDeps,
		packageFileVersion,
		lockFiles
	} : null;
}
//#endregion
export { extractPackageFile, parsePyProject };

//# sourceMappingURL=extract.js.map