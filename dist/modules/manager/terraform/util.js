import { regEx } from "../../../util/regex.js";
import { parseUrl } from "../../../util/url.js";
import { TerraformProviderDatasource } from "../../datasource/terraform-provider/index.js";
import { getDep } from "../dockerfile/extract.js";
import { extractLocks, findLockFile, readLockFile } from "./lockfile/util.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/util.ts
function checkFileContainsDependency(content, checkList) {
	return checkList.some((check) => content.includes(check));
}
function massageProviderLookupName(dep) {
	dep.packageName ??= dep.depName;
	if (!dep.packageName.includes("/")) dep.packageName = `hashicorp/${dep.packageName}`;
	dep.packageName = dep.packageName.toLowerCase();
}
function getLockedVersion(dep, locks) {
	const depRegistryUrl = dep.registryUrls ? dep.registryUrls[0] : TerraformProviderDatasource.getDefaultRegistryUrls()[0];
	const foundLock = locks.find((lock) => lock.packageName === dep.packageName && lock.registryUrl === depRegistryUrl);
	if (foundLock) return foundLock.version;
}
function applyOciDependency(dep, source, registryAliases) {
	const url = parseUrl(source);
	if (!url) {
		dep.skipReason = "invalid-url";
		return;
	}
	const imageRef = (url.host + url.pathname).replace(regEx(/\/\/.+$/), "");
	const parsed = getDep(imageRef, false, registryAliases);
	dep.packageName = parsed.packageName;
	dep.datasource = parsed.datasource;
	dep.currentValue = url.searchParams.get("tag") ?? void 0;
	dep.currentDigest = url.searchParams.get("digest") ?? void 0;
	if (!dep.currentValue && !dep.currentDigest) dep.skipReason = "unspecified-version";
}
async function extractLocksForPackageFile(fileName) {
	const locks = [];
	const lockFilePath = await findLockFile(fileName);
	if (lockFilePath) {
		const lockFileContent = await readLockFile(lockFilePath);
		if (lockFileContent) {
			const extractedLocks = extractLocks(lockFileContent);
			if (isNonEmptyArray(extractedLocks)) locks.push(...extractedLocks);
		}
	}
	return locks;
}
//#endregion
export { applyOciDependency, checkFileContainsDependency, extractLocksForPackageFile, getLockedVersion, massageProviderLookupName };

//# sourceMappingURL=util.js.map