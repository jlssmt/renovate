import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { ensureDir, getLocalFiles, getSiblingFileName, outputCacheFile, privateCacheDir, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getFiles } from "../../../util/git/index.js";
import { findGlobalJson, getConfiguredRegistries, getDefaultRegistries } from "./util.js";
import { artifactErrorResult, fileAddition, resolveToolConstraint } from "../util.js";
import { createNuGetConfigXml } from "./config-formatter.js";
import { GLOBAL_JSON, getDependentPackageFiles } from "./package-tree.js";
import { isNonEmptyString } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/nuget/artifacts.ts
async function createCachedNuGetConfigFile(nugetCacheDir, packageFileName, updatedDeps) {
	const registries = await getConfiguredRegistries(packageFileName) ?? getDefaultRegistries();
	const updatedDepsRegistries = Array.from(new Set(updatedDeps.flatMap((dep) => coerceArray(dep.registryUrls)).filter(isNonEmptyString)), (url) => ({ url }));
	const combinedRegistries = [...registries, ...updatedDepsRegistries];
	const contents = createNuGetConfigXml(combinedRegistries);
	const cachedNugetConfigFile = upath.join(nugetCacheDir, `nuget.config`);
	await ensureDir(nugetCacheDir);
	await outputCacheFile(cachedNugetConfigFile, contents);
	return cachedNugetConfigFile;
}
async function runDotnetRestore(packageFileName, dependentPackageFileNames, config, updatedDeps) {
	const nugetCacheDir = upath.join(privateCacheDir(), "nuget");
	const nugetConfigFile = await createCachedNuGetConfigFile(nugetCacheDir, packageFileName, updatedDeps);
	const dotnetVersion = await resolveToolConstraint(config, "dotnet", async () => (await findGlobalJson(packageFileName))?.sdk?.version);
	const execOptions = {
		docker: {},
		extraEnv: {
			NUGET_PACKAGES: upath.join(nugetCacheDir, "packages"),
			MSBUILDDISABLENODEREUSE: "1"
		},
		toolConstraints: [{
			toolName: "dotnet",
			constraint: dotnetVersion
		}]
	};
	const cmds = dependentPackageFileNames.map((fileName) => `dotnet restore ${quote(fileName)} --force-evaluate --configfile ${quote(nugetConfigFile)}`);
	if (config.postUpdateOptions?.includes("dotnetWorkloadRestore")) cmds.unshift(`dotnet workload restore --configfile ${quote(nugetConfigFile)}`);
	await exec(cmds, execOptions);
}
async function updateArtifacts({ packageFileName, newPackageFileContent, config, updatedDeps }) {
	logger.debug(`nuget.updateArtifacts(${packageFileName})`);
	const isCentralManagement = packageFileName === "Directory.Packages.props" || packageFileName === "Packages.props" || packageFileName.endsWith(`/Directory.Packages.props`) || packageFileName.endsWith(`/Packages.props`);
	const isGlobalJson = packageFileName === GLOBAL_JSON;
	const isDirectoryBuildProps = packageFileName === "Directory.Build.props" || packageFileName.endsWith(`/Directory.Build.props`);
	if (!isCentralManagement && !isGlobalJson && !isDirectoryBuildProps && !regEx(/(?:cs|vb|fs)proj$/i).test(packageFileName)) {
		logger.debug({ packageFileName }, "Not updating lock file for non project files");
		return null;
	}
	const deps = await getDependentPackageFiles(packageFileName, isCentralManagement || isDirectoryBuildProps, isGlobalJson);
	const packageFiles = deps.filter((d) => d.isLeaf).map((d) => d.name);
	logger.trace({ packageFiles }, `Found ${packageFiles.length} dependent package files`);
	const lockFileNames = deps.map((f) => getSiblingFileName(f.name, "packages.lock.json"));
	const existingLockFileContentMap = await getFiles(lockFileNames);
	if (!Object.values(existingLockFileContentMap).some((val) => !!val)) {
		logger.debug({ packageFileName }, "No lock file found for package or dependents");
		return null;
	}
	try {
		if (updatedDeps.length === 0 && config.isLockFileMaintenance !== true) {
			logger.debug(`Not updating lock file because no deps changed and no lock file maintenance.`);
			return null;
		}
		await writeLocalFile(packageFileName, newPackageFileContent);
		await runDotnetRestore(packageFileName, packageFiles, config, updatedDeps);
		const newLockFileContentMap = await getLocalFiles(lockFileNames);
		const retArray = [];
		for (const lockFileName of lockFileNames) if (existingLockFileContentMap[lockFileName] === newLockFileContentMap[lockFileName]) logger.trace(`Lock file ${lockFileName} is unchanged`);
		else if (newLockFileContentMap[lockFileName]) retArray.push(fileAddition(lockFileName, newLockFileContentMap[lockFileName]));
		return retArray.length > 0 ? retArray : null;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to generate lock file");
		return artifactErrorResult(lockFileNames.join(", "), err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map