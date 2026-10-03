import { minimatch } from "../../../util/minimatch.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/deno/index.js";
import { detectNodeCompatWorkspaces, extractDenoCompatiblePackageJson } from "./compat.js";
import { denoLandRegex, depValueRegex } from "./utils.js";
import { DenoLock } from "./schema.js";
import { isEmptyObject, isNonEmptyArray, isNonEmptyObject, isString } from "@sindresorhus/is";
import upath from "upath";
//#region lib/modules/manager/deno/post.ts
async function getDenoLock(filePath) {
	const lockfileContent = await readLocalFile(filePath, "utf8");
	if (!lockfileContent) {
		logger.debug({ filePath }, "Deno: unable to read lockfile");
		return { lockedVersions: {} };
	}
	const parsedLockfile = DenoLock.safeParse(lockfileContent);
	if (!parsedLockfile.success) {
		logger.debug({
			filePath,
			err: parsedLockfile.error
		}, "Deno: unable to parse lockfile");
		return { lockedVersions: {} };
	}
	if (parsedLockfile.data.lockfileVersion < 5) {
		logger.warn({ filePath }, "Deno: unsupported lockfile version. Please update the lock file on your own.");
		return { lockedVersions: {} };
	}
	return parsedLockfile.data;
}
function getLockedVersion(deps, lockFileContent) {
	if (isEmptyObject(lockFileContent)) return null;
	const { datasource, currentRawValue, currentValue, depName } = deps;
	if (datasource === "deno") {
		if (lockFileContent.remoteVersions && lockFileContent.remoteVersions.size > 0 && currentRawValue && lockFileContent.remoteVersions.has(currentRawValue)) return denoLandRegex.exec(currentRawValue)?.groups?.currentValue;
		const key = currentValue && depName ? `${depName}@${currentValue}` : depName;
		if (lockFileContent.redirectVersions && isNonEmptyObject(lockFileContent.redirectVersions) && key && lockFileContent.redirectVersions[key]) return denoLandRegex.exec(lockFileContent.redirectVersions[key])?.groups?.currentValue;
	}
	if (datasource === "jsr" || datasource === "npm") {
		if (!lockFileContent.lockedVersions || isEmptyObject(lockFileContent.lockedVersions)) return null;
		if (currentRawValue && lockFileContent.lockedVersions[currentRawValue]) return lockFileContent.lockedVersions[currentRawValue];
		if (currentRawValue && lockFileContent.lockedVersions[`${currentRawValue}@*`]) return lockFileContent.lockedVersions[`${currentRawValue}@*`];
		for (const [key, value] of Object.entries(lockFileContent.lockedVersions)) {
			const match = depValueRegex.exec(key);
			if (isString(depName) && match?.groups?.depName === depName && match?.groups?.datasource === datasource && currentValue && match?.groups?.currentValue && api.intersects(match.groups.currentValue, currentValue)) return value;
		}
		return null;
	}
	return null;
}
async function collectPackageJsonAsWorkspaceMember(packageFiles) {
	const workspaceRoots = packageFiles.filter((pkg) => isNonEmptyArray(pkg.managerData?.workspaces) && upath.basename(pkg.packageFile).startsWith("deno.json"));
	for (const workspaceRoot of workspaceRoots) {
		const { packagePaths } = await detectNodeCompatWorkspaces(workspaceRoot);
		for (const packagePath of packagePaths) {
			const packageFile = await extractDenoCompatiblePackageJson(packagePath);
			if (packageFile) {
				const pkg = {
					...packageFile,
					lockFiles: workspaceRoot.lockFiles
				};
				packageFiles.push(pkg);
			}
		}
	}
}
function normalizeWorkspace(packageFiles) {
	const workspaceContexts = [];
	const packageMap = {};
	for (const pkg of packageFiles) packageMap[pkg.packageFile] = pkg;
	for (const pkg of packageFiles) {
		const workspaces = pkg.managerData?.workspaces;
		if (isNonEmptyArray(workspaces)) {
			const rootDir = upath.dirname(pkg.packageFile);
			const matchers = workspaces.map((pattern) => minimatch(upath.normalize(pattern), {
				dot: true,
				partial: true
			}));
			workspaceContexts.push({
				lockFiles: pkg.lockFiles,
				rootDir,
				packageFile: pkg.packageFile,
				matchers
			});
		}
	}
	const validContexts = [];
	const invalidPackageFiles = /* @__PURE__ */ new Set();
	for (const [i, currentContext] of workspaceContexts.entries()) {
		let isNested = false;
		for (const [j, otherContext] of workspaceContexts.entries()) {
			if (i === j) continue;
			if (otherContext.matchers.some((matcher) => matcher.match(currentContext.rootDir))) {
				isNested = true;
				invalidPackageFiles.add(currentContext.packageFile);
				break;
			}
		}
		if (!isNested) validContexts.push(currentContext);
	}
	for (const packageFile of invalidPackageFiles) {
		const pkg = packageMap[packageFile];
		delete pkg?.managerData?.workspaces;
	}
	const workspaceRootFiles = /* @__PURE__ */ new Set();
	for (const pkg of packageFiles) {
		const workspaces = pkg.managerData?.workspaces;
		if (isNonEmptyArray(workspaces)) workspaceRootFiles.add(pkg.packageFile);
	}
	for (const pkg of packageFiles) {
		if (workspaceRootFiles.has(pkg.packageFile)) continue;
		for (const context of workspaceContexts) {
			const { rootDir, matchers, lockFiles } = context;
			const pkgRelativePath = upath.relative(rootDir, pkg.packageFile);
			const pkgDir = upath.dirname(pkgRelativePath);
			if (matchers.some((matcher) => matcher.match(pkgDir))) {
				pkg.lockFiles = lockFiles;
				break;
			}
		}
	}
}
async function applyLockedVersion(packageFiles) {
	const lockFileCache = {};
	for (const pkg of packageFiles) {
		if (!isNonEmptyArray(pkg.lockFiles)) continue;
		const lockFile = pkg.lockFiles[0];
		let lockFileContent = lockFileCache[lockFile];
		if (!lockFileContent) {
			lockFileContent = await getDenoLock(lockFile);
			lockFileCache[lockFile] = lockFileContent;
		}
		pkg.deps = pkg.deps.map((dep) => {
			const lockedVersion = getLockedVersion(dep, lockFileContent);
			return lockedVersion ? {
				...dep,
				lockedVersion
			} : dep;
		});
	}
}
async function postExtract(packageFiles) {
	await collectPackageJsonAsWorkspaceMember(packageFiles);
	normalizeWorkspace(packageFiles);
	await applyLockedVersion(packageFiles);
}
//#endregion
export { collectPackageJsonAsWorkspaceMember, getDenoLock, getLockedVersion, normalizeWorkspace, postExtract };

//# sourceMappingURL=post.js.map