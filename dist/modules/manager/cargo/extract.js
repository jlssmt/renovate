import { coerceObject } from "../../../util/object.js";
import { getEnv } from "../../../util/env.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { findLocalSiblingOrParent, readLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/cargo/index.js";
import { CargoConfig, CargoManifest } from "./schema.js";
import { extractLockFileVersions } from "./locked-version.js";
import { DEFAULT_REGISTRY_URL } from "./utils.js";
import { isObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/cargo/extract.ts
const DEFAULT_REGISTRY_ID = "crates-io";
function getCargoIndexEnv(registryName) {
	const registry = registryName.toUpperCase().replaceAll("-", "_");
	return getEnv()[`CARGO_REGISTRIES_${registry}_INDEX`] ?? null;
}
function extractFromSection(dependencies, cargoRegistries, target) {
	if (!dependencies) return [];
	const deps = [];
	for (const dep of Object.values(dependencies)) {
		let registryUrls;
		if (dep.managerData?.registryName) {
			const registryUrl = getCargoIndexEnv(dep.managerData.registryName) ?? cargoRegistries[dep.managerData?.registryName];
			if (registryUrl) {
				if (registryUrl !== DEFAULT_REGISTRY_URL) registryUrls = [registryUrl];
			} else dep.skipReason = "unknown-registry";
		}
		if (registryUrls) dep.registryUrls = registryUrls;
		else if (cargoRegistries[DEFAULT_REGISTRY_ID]) {
			if (cargoRegistries[DEFAULT_REGISTRY_ID] !== DEFAULT_REGISTRY_URL) dep.registryUrls = [cargoRegistries[DEFAULT_REGISTRY_ID]];
		} else dep.skipReason = "unknown-registry";
		if (target) dep.target = target;
		deps.push(dep);
	}
	return deps;
}
/** Reads `.cargo/config.toml`, or, if not found, `.cargo/config` */
async function readCargoConfig() {
	for (const configName of ["config.toml", "config"]) {
		const path = `.cargo/${configName}`;
		const payload = await readLocalFile(path, "utf8");
		if (payload) {
			const parsedCargoConfig = CargoConfig.safeParse(payload);
			if (parsedCargoConfig.success) return parsedCargoConfig.data;
			logger.debug({
				err: parsedCargoConfig.error,
				path
			}, `Error parsing cargo config`);
		}
	}
	logger.debug("Neither .cargo/config nor .cargo/config.toml found");
	return null;
}
/** Extracts a map of cargo registries from a CargoConfig */
function extractCargoRegistries(config) {
	const result = {};
	result[DEFAULT_REGISTRY_ID] = resolveRegistryIndex(DEFAULT_REGISTRY_ID, config);
	const registryNames = /* @__PURE__ */ new Set([...Object.keys(coerceObject(config.registries)), ...Object.keys(coerceObject(config.source))]);
	for (const registryName of registryNames) result[registryName] = resolveRegistryIndex(registryName, config);
	return result;
}
function resolveRegistryIndex(registryName, config, originalNames = /* @__PURE__ */ new Set()) {
	const replacementName = config.source?.[registryName]?.["replace-with"];
	if (replacementName) {
		logger.debug(`Replacing index of cargo registry ${registryName} with ${replacementName}`);
		if (originalNames.has(replacementName)) {
			logger.warn({ registryName }, "cargo registry resolves to itself");
			return null;
		}
		return resolveRegistryIndex(replacementName, config, originalNames.add(replacementName));
	}
	const sourceRegistry = config.source?.[registryName]?.registry;
	if (sourceRegistry) {
		logger.debug(`Replacing cargo source registry with ${sourceRegistry} for ${registryName}`);
		return sourceRegistry;
	}
	const registryIndex = config.registries?.[registryName]?.index;
	if (registryIndex) return registryIndex;
	if (registryName === DEFAULT_REGISTRY_ID) return DEFAULT_REGISTRY_URL;
	logger.debug(`${registryName} cargo registry is missing index`);
	return null;
}
async function extractPackageFile(content, packageFile, _config) {
	logger.trace(`cargo.extractPackageFile(${packageFile})`);
	const cargoRegistries = extractCargoRegistries(coerceObject(await readCargoConfig()));
	const parsedCargoManifest = CargoManifest.safeParse(content);
	if (!parsedCargoManifest.success) {
		logger.debug({
			err: parsedCargoManifest.error,
			packageFile
		}, "Error parsing Cargo.toml file");
		return null;
	}
	const cargoManifest = parsedCargoManifest.data;
	const targetSection = cargoManifest.target;
	let targetDeps = [];
	if (targetSection) Object.keys(targetSection).forEach((target) => {
		const targetContent = targetSection[target];
		const deps = [
			...extractFromSection(targetContent.dependencies, cargoRegistries, target),
			...extractFromSection(targetContent["dev-dependencies"], cargoRegistries, target),
			...extractFromSection(targetContent["build-dependencies"], cargoRegistries, target)
		];
		targetDeps = targetDeps.concat(deps);
	});
	const workspaceSection = cargoManifest.workspace;
	let workspaceDeps = [];
	if (workspaceSection) workspaceDeps = extractFromSection(workspaceSection.dependencies, cargoRegistries, void 0);
	const deps = [
		...extractFromSection(cargoManifest.dependencies, cargoRegistries),
		...extractFromSection(cargoManifest["dev-dependencies"], cargoRegistries),
		...extractFromSection(cargoManifest["build-dependencies"], cargoRegistries),
		...targetDeps,
		...workspaceDeps
	];
	if (!deps.length) return null;
	const packageSection = cargoManifest.package;
	let version = void 0;
	if (packageSection) {
		if (isString(packageSection.version)) version = packageSection.version;
		else if (isObject(packageSection.version) && cargoManifest.workspace?.package?.version) version = cargoManifest.workspace.package.version;
	}
	const lockFileName = await findLocalSiblingOrParent(packageFile, "Cargo.lock");
	const res = {
		deps,
		packageFileVersion: version
	};
	if (lockFileName) {
		logger.debug(`Found lock file ${lockFileName} for packageFile: ${packageFile}`);
		const versionsByPackage = await extractLockFileVersions(lockFileName);
		if (!versionsByPackage) {
			logger.debug(`Could not extract lock file versions from ${lockFileName}.`);
			return res;
		}
		res.lockFiles = [lockFileName];
		for (const dep of deps) {
			const packageName = dep.packageName ?? dep.depName;
			const versions = coerceArray(versionsByPackage.get(packageName));
			let lockedVersion = null;
			if (dep.currentValue) lockedVersion = api.getSatisfyingVersion(versions, dep.currentValue);
			if (lockedVersion) dep.lockedVersion = lockedVersion;
			else logger.debug(`No locked version found for package ${dep.depName} in the range of ${dep.currentValue}.`);
		}
	}
	return res;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map