import { logger } from "../../../../logger/index.js";
import { findLocalSiblingOrParent, getSiblingFileName, readLocalFile } from "../../../../util/fs/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { PnpmWorkspaceFile } from "../schema.js";
import { resolveNpmrc } from "../npmrc.js";
import { getExtractedConstraints } from "./common/dependency.js";
import { extractPackageJson, hasPackageManager } from "./common/package-file.js";
import { applyPnpmWorkspaceRegistries, extractPnpmWorkspaceFile } from "./pnpm.js";
import { extractYarnCatalogs, isZeroInstall } from "./yarn.js";
import { postExtract } from "./post/index.js";
import { loadConfigFromLegacyYarnrc, loadConfigFromYarnrcYml, resolveRegistryUrl } from "./yarnrc.js";
import { isArray, isNonEmptyObject, isNonEmptyStringAndNotWhitespace, isString } from "@sindresorhus/is";
import upath from "upath";
//#region lib/modules/manager/npm/extract/index.ts
function hasMultipleLockFiles(lockFiles) {
	return Object.values(lockFiles).filter(isString).length > 1;
}
async function extractPackageFile(content, packageFile, config) {
	logger.trace(`npm.extractPackageFile(${packageFile})`);
	logger.trace({ content });
	let packageJson;
	try {
		packageJson = JSON.parse(content);
	} catch {
		logger.debug({ packageFile }, `Invalid JSON`);
		return null;
	}
	const res = extractPackageJson(packageJson, packageFile);
	if (!res) return null;
	let workspacesPackages;
	if (isArray(packageJson.workspaces)) workspacesPackages = packageJson.workspaces;
	else workspacesPackages = packageJson.workspaces?.packages;
	const lockFiles = {
		yarnLock: "yarn.lock",
		packageLock: "package-lock.json",
		shrinkwrapJson: "npm-shrinkwrap.json",
		pnpmLockFile: "pnpm-lock.yaml"
	};
	for (const [key, val] of Object.entries(lockFiles)) {
		const filePath = getSiblingFileName(packageFile, val);
		if (await readLocalFile(filePath, "utf8")) lockFiles[key] = filePath;
		else lockFiles[key] = void 0;
	}
	lockFiles.npmLock = lockFiles.packageLock ?? lockFiles.shrinkwrapJson;
	delete lockFiles.packageLock;
	delete lockFiles.shrinkwrapJson;
	if (hasMultipleLockFiles(lockFiles)) logger.warn("Updating multiple npm lock files is deprecated and support will be removed in future versions.");
	const { npmrc, npmrcFileName } = await resolveNpmrc(packageFile, config);
	const yarnrcYmlFileName = await findLocalSiblingOrParent(packageFile, ".yarnrc.yml");
	const yarnZeroInstall = yarnrcYmlFileName ? await isZeroInstall(yarnrcYmlFileName) : false;
	let yarnrcConfig = null;
	const repoYarnrcYml = yarnrcYmlFileName ? await readLocalFile(yarnrcYmlFileName, "utf8") : null;
	if (isString(repoYarnrcYml) && repoYarnrcYml.trim().length > 0) yarnrcConfig = loadConfigFromYarnrcYml(repoYarnrcYml);
	const legacyYarnrcFileName = await findLocalSiblingOrParent(packageFile, ".yarnrc");
	const repoLegacyYarnrc = legacyYarnrcFileName ? await readLocalFile(legacyYarnrcFileName, "utf8") : null;
	if (isString(repoLegacyYarnrc) && repoLegacyYarnrc.trim().length > 0) yarnrcConfig = loadConfigFromLegacyYarnrc(repoLegacyYarnrc);
	let pnpmWorkspaceRegistry;
	let pnpmWorkspaceRegistries;
	const pnpmWorkspaceYamlFileName = await findLocalSiblingOrParent(packageFile, "pnpm-workspace.yaml");
	const repoPnpmWorkspaceYaml = pnpmWorkspaceYamlFileName ? await readLocalFile(pnpmWorkspaceYamlFileName, "utf8") : null;
	if (isNonEmptyStringAndNotWhitespace(repoPnpmWorkspaceYaml)) {
		const parsed = await PnpmWorkspaceFile.safeParseAsync(repoPnpmWorkspaceYaml);
		if (parsed.success) {
			pnpmWorkspaceRegistry = parsed.data.registry;
			pnpmWorkspaceRegistries = parsed.data.registries;
		} else logger.debug({
			packageFile: pnpmWorkspaceYamlFileName,
			err: parsed.error
		}, "Failed to parse pnpm-workspace.yaml");
	}
	if (res.deps.length === 0) {
		logger.debug("Package file has no deps");
		if (!(!!res.managerData?.packageJsonName || !!res.packageFileVersion || !!npmrc || workspacesPackages)) {
			logger.debug("Skipping file");
			return null;
		}
	}
	let skipInstalls = config.skipInstalls;
	if (skipInstalls === null) {
		if (!!res.deps.some((dep) => !!dep.currentValue?.startsWith("file:") || !!dep.currentValue?.startsWith("npm:")) && !!lockFiles.npmLock || yarnZeroInstall) {
			logger.debug("Automatically setting skipInstalls to false");
			skipInstalls = false;
		} else skipInstalls = true;
	}
	const extractedConstraints = getExtractedConstraints(res.deps);
	if (yarnrcConfig) {
		for (const dep of res.deps)
 // v8 ignore else -- TODO: add tests #40625
		if (dep.depName) {
			const registryUrlFromYarnrcConfig = resolveRegistryUrl(dep.packageName ?? dep.depName, yarnrcConfig);
			if (registryUrlFromYarnrcConfig && dep.datasource === NpmDatasource.id) dep.registryUrls = [registryUrlFromYarnrcConfig];
		}
	}
	applyPnpmWorkspaceRegistries(res.deps, pnpmWorkspaceRegistries, pnpmWorkspaceRegistry);
	return {
		...res,
		npmrc,
		managerData: {
			...res.managerData,
			...lockFiles,
			yarnZeroInstall,
			hasPackageManager: isNonEmptyStringAndNotWhitespace(packageJson.packageManager) || isNonEmptyObject(packageJson.devEngines?.packageManager),
			workspacesPackages,
			npmrcFileName
		},
		skipInstalls,
		extractedConstraints
	};
}
async function extractAllPackageFiles(config, packageFiles) {
	const npmFiles = [];
	for (const packageFile of packageFiles) {
		const content = await readLocalFile(packageFile, "utf8");
		if (content) {
			if (packageFile.endsWith("pnpm-workspace.yaml")) {
				logger.trace({ packageFile }, `Extracting as a pnpm-workspace.yaml file`);
				const parsedPnpmWorkspaceYaml = await PnpmWorkspaceFile.safeParseAsync(content);
				if (parsedPnpmWorkspaceYaml.success) {
					logger.trace({ packageFile }, `Extracting file as a pnpm workspace YAML file`);
					const deps = await extractPnpmWorkspaceFile(parsedPnpmWorkspaceYaml.data, packageFile);
					// v8 ignore else -- TODO: add test #40625
					if (deps) npmFiles.push({
						...deps,
						packageFile
					});
				} else logger.warn({
					packageFile,
					err: parsedPnpmWorkspaceYaml.error
				}, `Failed to parse pnpm-workspace.yaml file`);
			} else if (packageFile.endsWith("json")) {
				logger.trace({ packageFile }, `Extracting as a package.json file`);
				const deps = await extractPackageFile(content, packageFile, config);
				// v8 ignore else -- TODO: add tests #40625
				if (deps) npmFiles.push({
					...deps,
					packageFile
				});
			} else {
				logger.trace({ packageFile }, `Extracting as a .yarnrc.yml file`);
				const yarnConfig = loadConfigFromYarnrcYml(content);
				// v8 ignore else -- TODO: add tests #40625
				if (yarnConfig?.catalogs || yarnConfig?.catalog) {
					const hasPackageManagerResult = await hasPackageManager(upath.dirname(packageFile));
					const catalogsDeps = await extractYarnCatalogs({
						catalog: yarnConfig.catalog,
						catalogs: yarnConfig.catalogs
					}, packageFile, hasPackageManagerResult);
					// v8 ignore else -- TODO: add tests #40625
					if (catalogsDeps) npmFiles.push({
						...catalogsDeps,
						packageFile
					});
				}
			}
		} else logger.debug({ packageFile }, `No content found`);
	}
	await postExtract(npmFiles);
	return npmFiles;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=index.js.map