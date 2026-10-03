import { coerceObject } from "../../../../util/object.js";
import { GlobalConfig } from "../../../../config/global.js";
import { logger } from "../../../../logger/index.js";
import { parseSingleYaml, parseYaml } from "../../../../util/yaml.js";
import { findLocalSiblingOrParent, getSiblingFileName, localPathExists, readLocalFile } from "../../../../util/fs/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { extractDependency } from "./common/dependency.js";
import { pnpmWorkspaceOverrides } from "../dep-types.js";
import { extractCatalogDeps } from "./common/catalogs.js";
import { isNonEmptyObject, isNumber, isObject, isPlainObject, isString } from "@sindresorhus/is";
import upath from "upath";
import { parsePkgAndParentSelector } from "@pnpm/parse-overrides";
import { findPackages } from "find-packages";
//#region lib/modules/manager/npm/extract/pnpm.ts
function isPnpmLockfile(obj) {
	return isPlainObject(obj) && "lockfileVersion" in obj;
}
async function extractPnpmFilters(fileName) {
	try {
		const contents = parseSingleYaml(await readLocalFile(fileName, "utf8"));
		if (!Array.isArray(contents.packages) || !contents.packages.every((item) => isString(item))) {
			logger.trace({ fileName }, "Failed to find required \"packages\" array in pnpm-workspace.yaml");
			return;
		}
		return contents.packages;
	} catch (err) {
		logger.trace({
			fileName,
			err
		}, "Failed to parse pnpm-workspace.yaml");
		return;
	}
}
async function findPnpmWorkspace(packageFile) {
	const workspaceYamlPath = await findLocalSiblingOrParent(packageFile, "pnpm-workspace.yaml");
	if (!workspaceYamlPath) {
		logger.trace({ packageFile }, "Failed to locate pnpm-workspace.yaml in a parent directory.");
		return null;
	}
	const pnpmLockfilePath = getSiblingFileName(workspaceYamlPath, "pnpm-lock.yaml");
	if (!await localPathExists(pnpmLockfilePath)) {
		logger.trace({
			workspaceYamlPath,
			packageFile
		}, "Failed to find a pnpm-lock.yaml sibling for the workspace.");
		return null;
	}
	return {
		lockFilePath: pnpmLockfilePath,
		workspaceYamlPath
	};
}
async function detectPnpmWorkspaces(packageFiles) {
	logger.debug(`Detecting pnpm Workspaces`);
	const packagePathCache = /* @__PURE__ */ new Map();
	for (const p of packageFiles) {
		const { packageFile, managerData } = p;
		const pnpmLockFile = managerData?.pnpmLockFile;
		if (pnpmLockFile) {
			logger.trace({
				packageFile,
				pnpmLockFile
			}, "Found an existing pnpm shrinkwrap file; skipping pnpm monorepo check.");
			continue;
		}
		const pnpmWorkspace = await findPnpmWorkspace(packageFile);
		if (pnpmWorkspace === null) continue;
		const { workspaceYamlPath, lockFilePath } = pnpmWorkspace;
		if (!packagePathCache.has(workspaceYamlPath)) {
			const filters = await extractPnpmFilters(workspaceYamlPath);
			const localDir = GlobalConfig.get("localDir");
			const packagePaths = (await findPackages(upath.dirname(upath.join(localDir, workspaceYamlPath)), {
				patterns: filters,
				ignore: ["**/node_modules/**", "**/bower_components/**"]
			})).map((pkg) => upath.join(pkg.dir, "package.json"));
			packagePathCache.set(workspaceYamlPath, packagePaths);
		}
		if (packagePathCache.get(workspaceYamlPath)?.some((p) => p.endsWith(packageFile))) {
			p.managerData ??= {};
			p.managerData.pnpmLockFile = lockFilePath;
		} else logger.trace({
			packageFile,
			workspaceYamlPath
		}, `Didn't find the package in the pnpm workspace`);
	}
}
async function getPnpmLock(filePath) {
	try {
		const pnpmLockRaw = await readLocalFile(filePath, "utf8");
		if (!pnpmLockRaw) throw new Error("Unable to read pnpm-lock.yaml");
		const lockParsed = parseYaml(pnpmLockRaw).at(-1);
		if (!isPnpmLockfile(lockParsed)) throw new Error("Invalid or empty lockfile");
		logger.trace({ lockParsed }, "pnpm lockfile parsed");
		const lockfileVersion = isNumber(lockParsed.lockfileVersion) ? lockParsed.lockfileVersion : parseFloat(lockParsed.lockfileVersion);
		return {
			lockedVersionsWithPath: getLockedVersions(lockParsed),
			lockedVersionsWithCatalog: getLockedCatalogVersions(lockParsed),
			lockfileVersion
		};
	} catch (err) {
		logger.debug({
			filePath,
			err
		}, "Warning: Exception parsing pnpm lockfile");
		return { lockedVersions: {} };
	}
}
function getLockedCatalogVersions(lockParsed) {
	const lockedVersions = {};
	if (isNonEmptyObject(lockParsed.catalogs)) for (const [catalog, dependencies] of Object.entries(lockParsed.catalogs)) {
		const versions = {};
		for (const [dep, versionCarrier] of Object.entries(dependencies)) versions[dep] = versionCarrier.version;
		lockedVersions[catalog] = versions;
	}
	return lockedVersions;
}
function getLockedVersions(lockParsed) {
	const lockedVersions = {};
	if (isNonEmptyObject(lockParsed.importers)) for (const [importer, imports] of Object.entries(lockParsed.importers)) lockedVersions[importer] = getLockedDependencyVersions(imports);
	else lockedVersions["."] = getLockedDependencyVersions(lockParsed);
	return lockedVersions;
}
function getLockedDependencyVersions(obj) {
	const dependencyTypes = [
		"dependencies",
		"devDependencies",
		"optionalDependencies"
	];
	const res = {};
	for (const depType of dependencyTypes) {
		res[depType] = {};
		for (const [pkgName, versionCarrier] of Object.entries(coerceObject(obj[depType]))) {
			let version;
			if (isObject(versionCarrier)) version = versionCarrier.version;
			else version = versionCarrier;
			const pkgVersion = version.split("(")[0].trim();
			res[depType][pkgName] = pkgVersion;
		}
	}
	return res;
}
async function extractPnpmWorkspaceFile(workspaceFile, packageFile) {
	logger.trace(`pnpm.extractPnpmWorkspaceFile(${packageFile})`);
	const pnpmCatalogs = pnpmCatalogsToArray(workspaceFile);
	const deps = extractCatalogDeps(pnpmCatalogs);
	if (workspaceFile.overrides) for (const [overridesKey, overridesVal] of Object.entries(workspaceFile.overrides)) {
		const packageName = parsePkgAndParentSelector(overridesKey).targetPkg.name;
		const depType = pnpmWorkspaceOverrides;
		deps.push({
			depName: overridesKey,
			packageName,
			depType,
			...extractDependency(depType, packageName, overridesVal)
		});
	}
	const { registry, registries } = workspaceFile;
	applyPnpmWorkspaceRegistries(deps, registries, registry);
	let pnpmLockFile;
	const filePath = getSiblingFileName(packageFile, "pnpm-lock.yaml");
	if (await readLocalFile(filePath, "utf8")) pnpmLockFile = filePath;
	return {
		deps,
		managerData: { pnpmLockFile }
	};
}
function pnpmCatalogsToArray({ catalog: defaultCatalogDeps, catalogs: namedCatalogs }) {
	const result = [];
	if (defaultCatalogDeps !== void 0) result.push({
		name: "default",
		dependencies: defaultCatalogDeps
	});
	if (!namedCatalogs) return result;
	for (const [name, dependencies] of Object.entries(namedCatalogs)) result.push({
		name,
		dependencies
	});
	return result;
}
function applyPnpmWorkspaceRegistries(deps, registries, registry) {
	if (!(registry ?? registries)) return;
	for (const dep of deps) {
		const lookupName = dep.packageName ?? dep.depName;
		if (lookupName && dep.datasource === NpmDatasource.id) {
			const registryUrl = resolveRegistryUrl(lookupName, registries, registry);
			if (registryUrl) dep.registryUrls = [registryUrl];
		}
	}
}
function resolveRegistryUrl(packageName, registries, defaultRegistry) {
	if (registries) {
		for (const scope in registries) {
			if (scope === "default") continue;
			if (packageName.startsWith(`${scope}/`)) return registries[scope];
		}
		if (registries.default) return registries.default;
	}
	return defaultRegistry ?? null;
}
//#endregion
export { applyPnpmWorkspaceRegistries, detectPnpmWorkspaces, extractPnpmFilters, extractPnpmWorkspaceFile, findPnpmWorkspace, getPnpmLock, resolveRegistryUrl };

//# sourceMappingURL=pnpm.js.map