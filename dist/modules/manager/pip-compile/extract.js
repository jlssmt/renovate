import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureLocalPath } from "../../../util/fs/util.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { extractPackageFile as extractPackageFile$1 } from "../pip_requirements/extract.js";
import { extractPackageFile as extractPackageFile$2 } from "../pep621/extract.js";
import { extractPackageFile as extractPackageFile$3 } from "../pip_setup/extract.js";
import "../pip_setup/index.js";
import { extractHeaderCommand, matchManager } from "./common.js";
import { generateMermaidGraph, inferCommandExecDir, sortPackageFiles } from "./utils.js";
import upath from "upath";
//#region lib/modules/manager/pip-compile/extract.ts
async function extractPackageFile(content, packageFile, _config) {
	logger.trace("pip-compile.extractPackageFile()");
	const manager = matchManager(packageFile);
	switch (manager) {
		case "pip_setup": return extractPackageFile$3(content, packageFile, _config);
		case "pip_requirements": return extractPackageFile$1(content);
		case "pep621": return await extractPackageFile$2(content, packageFile, _config);
		case "unknown":
			logger.warn({ packageFile }, `pip-compile: could not determine manager for source file`);
			return null;
		default:
			logger.warn({
				packageFile,
				manager
			}, `pip-compile: support for manager is not yet implemented`);
			return null;
	}
}
async function extractAllPackageFiles(config, matchedFiles) {
	logger.trace("pip-compile.extractAllPackageFiles()");
	const lockFileArgs = /* @__PURE__ */ new Map();
	const depsBetweenFiles = [];
	const packageFiles = /* @__PURE__ */ new Map();
	const lockFileSources = /* @__PURE__ */ new Map();
	for (const matchedFile of matchedFiles) {
		const fileContent = await readLocalFile(matchedFile, "utf8");
		if (!fileContent) {
			logger.debug(`pip-compile: no content found for file ${matchedFile}`);
			continue;
		}
		let compileArgs;
		let compileDir;
		try {
			compileArgs = extractHeaderCommand(fileContent, matchedFile);
			compileDir = inferCommandExecDir(matchedFile, compileArgs.outputFile);
		} catch (error) {
			logger.warn({
				matchedFile,
				errorMessage: error.message
			}, "pip-compile error");
			continue;
		}
		lockFileArgs.set(matchedFile, compileArgs);
		for (const constraint of coerceArray(compileArgs.constraintsFiles)) depsBetweenFiles.push({
			sourceFile: constraint,
			outputFile: matchedFile,
			type: "constraint"
		});
		for (const override of coerceArray(compileArgs.overridesFiles)) depsBetweenFiles.push({
			sourceFile: override,
			outputFile: matchedFile,
			type: "override"
		});
		const lockedDeps = extractPackageFile$1(fileContent)?.deps;
		if (!lockedDeps) {
			logger.debug({ matchedFile }, "pip-compile: Failed to extract dependencies from lock file");
			continue;
		}
		for (const relativeSourceFile of compileArgs.sourceFiles) {
			const packageFile = upath.normalizeTrim(upath.join(compileDir, relativeSourceFile));
			try {
				ensureLocalPath(packageFile);
			} catch {
				logger.warn({
					matchedFile,
					packageFile
				}, "pip-compile: Source file path outside of repository");
				continue;
			}
			depsBetweenFiles.push({
				sourceFile: packageFile,
				outputFile: matchedFile,
				type: "requirement"
			});
			if (matchedFiles.includes(packageFile)) {
				logger.warn({
					sourceFile: packageFile,
					lockFile: matchedFile
				}, "pip-compile: lock file acts as source file for another lock file");
				continue;
			}
			if (packageFiles.has(packageFile)) {
				logger.debug(`pip-compile: ${packageFile} used in multiple output files`);
				const existingPackageFile = packageFiles.get(packageFile);
				existingPackageFile.lockFiles.push(matchedFile);
				extendWithIndirectDeps(existingPackageFile, lockedDeps);
				const source = coerceArray(lockFileSources.get(matchedFile));
				source.push(existingPackageFile);
				lockFileSources.set(matchedFile, source);
				continue;
			}
			const content = await readLocalFile(packageFile, "utf8");
			if (!content) {
				logger.debug(`pip-compile: No content for source file ${packageFile}`);
				continue;
			}
			const packageFileContent = await extractPackageFile(content, packageFile, config);
			if (packageFileContent) {
				if (packageFileContent.managerData?.requirementsFiles) {
					packageFileContent.managerData.requirementsFiles = packageFileContent.managerData.requirementsFiles.map((file) => upath.normalize(upath.join(upath.dirname(packageFile), file)));
					for (const file of packageFileContent.managerData.requirementsFiles) depsBetweenFiles.push({
						sourceFile: file,
						outputFile: packageFile,
						type: "requirement"
					});
				}
				if (packageFileContent.managerData?.constraintsFiles) {
					packageFileContent.managerData.constraintsFiles = packageFileContent.managerData.constraintsFiles.map((file) => upath.normalize(upath.join(compileDir, file)));
					for (const file of packageFileContent.managerData.constraintsFiles) depsBetweenFiles.push({
						sourceFile: file,
						outputFile: packageFile,
						type: "requirement"
					});
				}
				for (const dep of packageFileContent.deps) {
					const lockedVersion = lockedDeps?.find((lockedDep) => lockedDep.packageName === dep.packageName)?.currentVersion;
					if (lockedVersion) dep.lockedVersion = lockedVersion;
					else logger.warn({
						depName: dep.depName,
						lockFile: matchedFile
					}, "pip-compile: dependency not found in lock file");
				}
				extendWithIndirectDeps(packageFileContent, lockedDeps);
				const newPackageFile = {
					...packageFileContent,
					lockFiles: [matchedFile],
					packageFile
				};
				packageFiles.set(packageFile, newPackageFile);
				const source = coerceArray(lockFileSources.get(matchedFile));
				source.push(newPackageFile);
				lockFileSources.set(matchedFile, source);
			} else logger.warn({ packageFile }, "pip-compile: failed to find dependencies in source file");
		}
	}
	if (packageFiles.size === 0) return null;
	const result = sortPackageFiles(depsBetweenFiles, packageFiles);
	for (const packageFile of [...result].reverse()) for (const reqFile of coerceArray(packageFile.managerData?.requirementsFiles)) {
		let sourceFiles = void 0;
		if (matchedFiles.includes(reqFile)) sourceFiles = lockFileSources.get(reqFile);
		else if (packageFiles.has(reqFile)) sourceFiles = [packageFiles.get(reqFile)];
		if (!sourceFiles) {
			logger.warn({
				packageFile: packageFile.packageFile,
				requirementsFile: reqFile
			}, "pip-compile: Package file references a file which does not appear to be a requirements file managed by pip-compile");
			continue;
		}
		const files = new Set([...packageFile.lockFiles].reverse());
		for (const sourceFile of sourceFiles) {
			const merged = new Set(files);
			for (const lockFile of [...sourceFile.lockFiles].reverse()) merged.add(lockFile);
			sourceFile.lockFiles = Array.from(merged).reverse();
		}
	}
	logger.debug(`pip-compile: dependency graph:\n${generateMermaidGraph(depsBetweenFiles, lockFileArgs)}`);
	return result;
}
function extendWithIndirectDeps(packageFileContent, lockedDeps) {
	for (const lockedDep of lockedDeps) if (!packageFileContent.deps.find((dep) => lockedDep.packageName === dep.packageName)) packageFileContent.deps.push(indirectDep(lockedDep));
}
/**
* As indirect dependecies don't exist in the package file, we need to
* create them from the lock file.
*
* By removing currentValue and currentVersion, we ensure that they
* are handled like unconstrained dependencies with locked version.
* Such packages are updated when their update strategy
* is set to 'update-lockfile',
* see: lib/workers/repository/process/lookup/index.ts.
*
* By disabling them by default, we won't create noise by updating them.
* Unless they have vulnerability alert, then they are forced to be updated.
* @param dep dependency extracted from lock file (requirements.txt)
* @returns unconstrained dependency with locked version
*/
function indirectDep(dep) {
	const result = {
		...dep,
		lockedVersion: dep.currentVersion,
		depType: "indirect",
		enabled: false
	};
	delete result.currentValue;
	delete result.currentVersion;
	return result;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map