import { coerceObject } from "../../../util/object.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, localPathExists } from "../../../util/fs/index.js";
import { api } from "../../versioning/hex/index.js";
import { HexDatasource } from "../../datasource/hex/index.js";
import { GleamToml } from "./schema.js";
import { extractLockFileVersions } from "./locked-version.js";
//#region lib/modules/manager/gleam/extract.ts
const dependencySections = ["dependencies", "dev-dependencies"];
function mapSectionKey(sectionKey) {
	switch (sectionKey) {
		case "dev-dependencies": return "devDependencies";
		default: return sectionKey;
	}
}
function toPackageDep({ name, sectionKey, version }) {
	return {
		depName: name,
		depType: mapSectionKey(sectionKey),
		datasource: HexDatasource.id,
		currentValue: version
	};
}
function toPackageDeps({ deps, sectionKey }) {
	return Object.entries(coerceObject(deps)).map(([name, version]) => toPackageDep({
		name,
		sectionKey,
		version
	}));
}
function extractGleamTomlDeps(gleamToml) {
	return dependencySections.flatMap((sectionKey) => toPackageDeps({
		deps: gleamToml[sectionKey],
		sectionKey
	}));
}
async function extractPackageFile(content, packageFile) {
	const result = GleamToml.safeParse(content);
	if (!result.success) {
		logger.debug({
			err: result.error,
			packageFile
		}, "Error parsing Gleam package file content");
		return null;
	}
	const deps = extractGleamTomlDeps(result.data);
	if (!deps.length) {
		logger.debug(`No dependencies found in Gleam package file ${packageFile}`);
		return null;
	}
	const packageFileContent = { deps };
	const lockFileName = getSiblingFileName(packageFile, "manifest.toml");
	if (!await localPathExists(lockFileName)) {
		logger.debug(`Lock file ${lockFileName} does not exist.`);
		return packageFileContent;
	}
	const versionsByPackage = await extractLockFileVersions(lockFileName);
	if (!versionsByPackage) return packageFileContent;
	packageFileContent.lockFiles = [lockFileName];
	for (const dep of packageFileContent.deps) {
		const packageName = dep.depName;
		const versions = coerceArray(versionsByPackage.get(packageName));
		const lockedVersion = api.getSatisfyingVersion(versions, dep.currentValue);
		if (lockedVersion) dep.lockedVersion = lockedVersion;
		else logger.debug(`No locked version found for package ${dep.depName} in the range of ${dep.currentValue}.`);
	}
	return packageFileContent;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map