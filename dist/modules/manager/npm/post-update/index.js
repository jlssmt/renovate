import { getEnv } from "../../../../util/env.js";
import { newlineRegex, regEx } from "../../../../util/regex.js";
import { logger } from "../../../../logger/index.js";
import { ensureTrailingSlash } from "../../../../util/url.js";
import { find } from "../../../../util/host-rules.js";
import { dump, parseSingleYaml } from "../../../../util/yaml.js";
import { ExternalHostError } from "../../../../types/errors/external-host-error.js";
import { ensureCacheDir, getSiblingFileName, readLocalFile, writeLocalFile } from "../../../../util/fs/index.js";
import { getFile, getRepoStatus } from "../../../../util/git/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { artifactErrorMessageFromExecError } from "../../util.js";
import { PNPM_CACHE_BASE_DIR, YARN_CACHE_DIR, YARN_GLOBAL_DIR } from "../constants.js";
import { processHostRules } from "./rules.js";
import { composeLockFile, parseLockFile, withNpmrcHostRules } from "../utils.js";
import { getZeroInstallPaths } from "../extract/yarn.js";
import { scm } from "../../../platform/scm.js";
import { generateLockFile } from "./npm.js";
import { generateLockFile as generateLockFile$1 } from "./pnpm.js";
import { fuzzyMatchAdditionalYarnrcYml, generateLockFile as generateLockFile$2, isYarnUpdate } from "./yarn.js";
import { isNonEmptyStringAndNotWhitespace, isString } from "@sindresorhus/is";
import upath from "upath";
import merge from "deepmerge";
//#region lib/modules/manager/npm/post-update/index.ts
function getDirs(arr) {
	return Array.from(new Set(arr.filter(isString)));
}
function determineLockFileDirs(config, packageFiles) {
	const npmLockDirs = [];
	const yarnLockDirs = [];
	const pnpmLockFileDirs = [];
	for (const upgrade of config.upgrades)
 // v8 ignore else -- TODO: add test #40625
	if (upgrade.updateType === "lockFileMaintenance" || upgrade.isRemediation === true || upgrade.isLockfileUpdate === true) {
		yarnLockDirs.push(upgrade.managerData?.yarnLock);
		npmLockDirs.push(upgrade.managerData?.npmLock);
		pnpmLockFileDirs.push(upgrade.managerData?.pnpmLockFile);
	}
	if (config.upgrades.every((upgrade) => upgrade.updateType === "lockFileMaintenance" || upgrade.isLockfileUpdate)) return {
		yarnLockDirs: getDirs(yarnLockDirs),
		npmLockDirs: getDirs(npmLockDirs),
		pnpmLockFileDirs: getDirs(pnpmLockFileDirs)
	};
	function getPackageFile(fileName) {
		logger.trace(`Looking for packageFile: ${fileName}`);
		for (const packageFile of packageFiles.npm) {
			if (packageFile.packageFile === fileName) {
				logger.trace({ packageFile }, "Found packageFile");
				return packageFile;
			}
			logger.trace("No match");
		}
		return {};
	}
	for (const p of config.updatedPackageFiles) {
		logger.trace(`Checking ${String(p.path)} for lock files`);
		const packageFile = getPackageFile(p.path);
		/* v8 ignore next -- needs test */
		if (!packageFile.managerData) continue;
		yarnLockDirs.push(packageFile.managerData.yarnLock);
		npmLockDirs.push(packageFile.managerData.npmLock);
		pnpmLockFileDirs.push(packageFile.managerData.pnpmLockFile);
	}
	return {
		yarnLockDirs: getDirs(yarnLockDirs),
		npmLockDirs: getDirs(npmLockDirs),
		pnpmLockFileDirs: getDirs(pnpmLockFileDirs)
	};
}
async function writeExistingFiles(config, packageFiles, originalNpmrcFiles = /* @__PURE__ */ new Map()) {
	if (!packageFiles.npm) return;
	const npmFiles = packageFiles.npm;
	logger.debug({ packageFiles: npmFiles.map((n) => n.packageFile) }, "Writing package.json files");
	for (const packageFile of npmFiles) {
		/* v8 ignore if -- TODO: add test #40625 */
		if (!packageFile.managerData) continue;
		const basedir = upath.dirname(packageFile.packageFile);
		const npmrc = packageFile.npmrc;
		const npmrcFilename = upath.join(basedir, ".npmrc");
		if (isString(npmrc) && (npmrcFilename === packageFile.managerData.npmrcFileName || !packageFile.managerData.npmrcFileName)) try {
			if (!originalNpmrcFiles.has(npmrcFilename)) {
				const originalNpmrc = await readLocalFile(npmrcFilename, "utf8");
				if (isString(originalNpmrc)) originalNpmrcFiles.set(npmrcFilename, originalNpmrc);
			}
			await writeLocalFile(npmrcFilename, npmrc.replace(regEx(/\n?$/), "\n"));
		} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
			logger.warn({
				npmrcFilename,
				err
			}, "Error writing .npmrc");
		}
		const npmLock = packageFile.managerData.npmLock;
		if (npmLock) {
			const npmLockPath = npmLock;
			logger.debug(`Writing ${npmLock}`);
			let existingNpmLock;
			try {
				existingNpmLock = await getFile(npmLock) ?? "";
			} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
				logger.warn({ err }, "Error reading npm lock file");
				existingNpmLock = "";
			}
			const { detectedIndent, lockFileParsed: npmLockParsed } = parseLockFile(existingNpmLock);
			if (npmLockParsed) {
				const packageNames = "packages" in npmLockParsed ? Object.keys(npmLockParsed.packages) : [];
				const widens = [];
				let lockFileChanged = false;
				for (const upgrade of config.upgrades) {
					if (upgrade.lockFiles && !upgrade.lockFiles.includes(npmLock)) continue;
					if (!upgrade.managerData) continue;
					if (upgrade.rangeStrategy === "widen" && upgrade.managerData.npmLock === npmLock) widens.push(upgrade.depName);
					const { depName } = upgrade;
					const oldVersion = upgrade.lockedVersion ?? upgrade.currentVersion;
					if ("packages" in npmLockParsed) for (const packageName of packageNames) {
						if (packageName === `node_modules/${depName}` || packageName.startsWith(`node_modules/${depName}/`)) {
							logger.trace({ packageName }, "Massaging out package name");
							lockFileChanged = true;
							delete npmLockParsed.packages[packageName];
							continue;
						}
						if (!depName || !oldVersion || !packageName.startsWith("node_modules/")) continue;
						const entry = npmLockParsed.packages[packageName];
						if (entry?.peerDependencies?.[depName] === oldVersion || entry?.dependencies?.[depName] === oldVersion || entry?.optionalDependencies?.[depName] === oldVersion) {
							logger.trace({
								packageName,
								depName,
								oldVersion
							}, "Massaging out lockstep sibling");
							lockFileChanged = true;
							delete npmLockParsed.packages[packageName];
						}
					}
				}
				// v8 ignore else -- TODO: add test #40625
				if (widens.length) {
					logger.debug(`Removing ${String(widens)} from ${npmLock} to force an update`);
					lockFileChanged = true;
					try {
						if ("dependencies" in npmLockParsed && npmLockParsed.dependencies) widens.forEach((depName) => {
							delete npmLockParsed.dependencies[depName];
						});
					} catch /* v8 ignore next -- TODO: add test #40625 */ {
						logger.warn({ npmLock }, "Error massaging package-lock.json for widen");
					}
				}
				// v8 ignore else -- TODO: add test #40625
				if (lockFileChanged) {
					logger.debug("Massaging npm lock file before writing to disk");
					existingNpmLock = composeLockFile(npmLockParsed, detectedIndent);
				}
				await writeLocalFile(npmLockPath, existingNpmLock);
			}
		}
	}
}
async function restoreNpmrcFiles(originalNpmrcFiles) {
	for (const [npmrcFilename, originalNpmrc] of originalNpmrcFiles) try {
		await writeLocalFile(npmrcFilename, originalNpmrc);
	} catch (err) {
		logger.warn({
			npmrcFilename,
			err
		}, "Error restoring .npmrc");
	}
}
async function writeUpdatedPackageFiles(config) {
	logger.trace({ config }, "writeUpdatedPackageFiles");
	logger.debug("Writing any updated package files");
	if (!config.updatedPackageFiles) {
		logger.debug("No files found");
		return;
	}
	const artifactContents = /* @__PURE__ */ new Map();
	if (config.updatedArtifacts) {
		for (const artifact of config.updatedArtifacts) if (artifact.type === "addition" && artifact.contents) artifactContents.set(artifact.path, artifact.contents.toString());
	}
	const supportedLockFiles = ["package-lock.json", "yarn.lock"];
	for (const packageFile of config.updatedPackageFiles) {
		if (packageFile.type !== "addition") continue;
		if (supportedLockFiles.some((fileName) => packageFile.path.endsWith(fileName))) {
			logger.debug(`Writing lock file: ${packageFile.path}`);
			await writeLocalFile(packageFile.path, packageFile.contents);
			continue;
		}
		if (!(packageFile.path.endsWith("package.json") || packageFile.path.endsWith("pnpm-workspace.yaml") || packageFile.path.endsWith(".yarnrc.yml"))) continue;
		const contents = artifactContents.get(packageFile.path) ?? packageFile.contents;
		logger.debug(`Writing ${packageFile.path}`);
		await writeLocalFile(packageFile.path, contents);
	}
}
/* v8 ignore next -- needs test */
async function updateYarnOffline(lockFileDir, updatedArtifacts) {
	try {
		const resolvedPaths = [];
		const yarnrcYml = await getFile(upath.join(lockFileDir, ".yarnrc.yml"));
		const yarnrc = await getFile(upath.join(lockFileDir, ".yarnrc"));
		if (yarnrcYml) {
			const paths = getZeroInstallPaths(yarnrcYml);
			resolvedPaths.push(...paths.map((p) => upath.join(lockFileDir, p)));
		} else if (yarnrc) {
			const mirrorLine = yarnrc.split(newlineRegex).find((line) => line.startsWith("yarn-offline-mirror "));
			if (mirrorLine) {
				const mirrorPath = ensureTrailingSlash(mirrorLine.split(" ")[1].replace(regEx(/"/g), ""));
				resolvedPaths.push(upath.join(lockFileDir, mirrorPath));
			}
		}
		logger.debug({ resolvedPaths }, "updateYarnOffline resolvedPaths");
		if (resolvedPaths.length) {
			const status = await getRepoStatus();
			for (const f of status.modified.concat(status.not_added)) if (resolvedPaths.some((p) => f.startsWith(p))) updatedArtifacts.push({
				type: "addition",
				path: f,
				contents: await readLocalFile(f)
			});
			for (const f of status.deleted || []) if (resolvedPaths.some((p) => f.startsWith(p))) updatedArtifacts.push({
				type: "deletion",
				path: f
			});
		}
	} catch (err) {
		logger.error({ err }, "Error updating yarn offline packages");
	}
}
async function updateYarnBinary(lockFileDir, updatedArtifacts, existingYarnrcYmlContent) {
	let yarnrcYml = existingYarnrcYmlContent;
	try {
		const yarnrcYmlFilename = upath.join(lockFileDir, ".yarnrc.yml");
		yarnrcYml ??= await getFile(yarnrcYmlFilename) ?? void 0;
		const newYarnrcYml = await readLocalFile(yarnrcYmlFilename, "utf8");
		if (!isString(yarnrcYml) || !isString(newYarnrcYml)) return existingYarnrcYmlContent;
		const oldYarnPath = parseSingleYaml(yarnrcYml)?.yarnPath;
		const newYarnPath = parseSingleYaml(newYarnrcYml)?.yarnPath;
		if (!isNonEmptyStringAndNotWhitespace(oldYarnPath) || !isNonEmptyStringAndNotWhitespace(newYarnPath)) return existingYarnrcYmlContent;
		const oldYarnFullPath = upath.join(lockFileDir, oldYarnPath);
		const newYarnFullPath = upath.join(lockFileDir, newYarnPath);
		logger.debug({
			oldYarnPath,
			newYarnPath
		}, "Found updated Yarn binary");
		yarnrcYml = yarnrcYml.replace(oldYarnPath, newYarnPath);
		updatedArtifacts.push({
			type: "addition",
			path: yarnrcYmlFilename,
			contents: yarnrcYml
		}, {
			type: "deletion",
			path: oldYarnFullPath
		}, {
			type: "addition",
			path: newYarnFullPath,
			contents: await readLocalFile(newYarnFullPath, "utf8"),
			isExecutable: true
		});
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.error({ err }, "Error updating Yarn binary");
	}
	return existingYarnrcYmlContent && yarnrcYml;
}
async function getAdditionalFilesInner(config, packageFiles, originalNpmrcFiles) {
	logger.trace({ config }, "getAdditionalFiles");
	const artifactErrors = [];
	const artifactNotices = [];
	const updatedArtifacts = [];
	if (!packageFiles.npm?.length) return {
		artifactErrors,
		artifactNotices,
		updatedArtifacts
	};
	if (config.skipArtifactsUpdate) {
		logger.debug("Skipping lock file generation");
		return {
			artifactErrors,
			artifactNotices,
			updatedArtifacts
		};
	}
	logger.debug("Getting updated lock files");
	if (config.isLockFileMaintenance && config.reuseExistingBranch && await scm.branchExists(config.branchName)) {
		logger.debug("Skipping lockFileMaintenance update");
		return {
			artifactErrors,
			artifactNotices,
			updatedArtifacts
		};
	}
	const dirs = determineLockFileDirs(config, packageFiles);
	logger.trace({ dirs }, "lock file dirs");
	await writeExistingFiles(config, packageFiles, originalNpmrcFiles);
	await writeUpdatedPackageFiles(config);
	const { additionalNpmrcContent, additionalYarnRcYml } = processHostRules();
	const env = {
		...getEnv(),
		NPM_CONFIG_CACHE: await ensureCacheDir("npm"),
		YARN_CACHE_FOLDER: await ensureCacheDir(YARN_CACHE_DIR),
		YARN_GLOBAL_FOLDER: await ensureCacheDir(YARN_GLOBAL_DIR),
		npm_config_store: await ensureCacheDir(PNPM_CACHE_BASE_DIR),
		NODE_ENV: "dev"
	};
	let token;
	try {
		({token} = find({
			hostType: "github",
			url: "https://api.github.com/"
		}));
		// v8 ignore next -- TODO: add test #40625
		token = token ? `${token}@` : token;
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "Error getting token for packageFile");
	}
	const tokenRe = regEx(`${token ?? ""}`, "g", false);
	for (const npmLock of dirs.npmLockDirs) {
		const lockFileDir = upath.dirname(npmLock);
		await withNpmrcHostRules(lockFileDir, additionalNpmrcContent, async (npmrcContent) => {
			const fileName = upath.basename(npmLock);
			logger.debug(`Generating ${fileName} for ${lockFileDir}`);
			const upgrades = config.upgrades.filter((upgrade) => upgrade.managerData?.npmLock === npmLock);
			const res = await generateLockFile(lockFileDir, env, fileName, config, upgrades, npmrcContent);
			if (res.error) {
				/* v8 ignore next -- needs test */
				if (res.stderr?.includes("No matching version found for")) {
					for (const upgrade of config.upgrades) if (res.stderr.includes(`No matching version found for ${upgrade.depName}`)) {
						logger.debug({
							dependency: upgrade.depName,
							type: "npm"
						}, "lock file failed for the dependency being updated - skipping branch creation");
						throw new ExternalHostError(/* @__PURE__ */ new Error("lock file failed for the dependency being updated - skipping branch creation"), NpmDatasource.id);
					}
				}
				artifactErrors.push({
					fileName: npmLock,
					stderr: res.stderr
				});
			} else if (res.lockFile) {
				if (res.beforeFallback) {
					const message = "npm `--before` could not be enforced because existing locked packages were published after the `minimumReleaseAge` cutoff. This will resolve after the next lock file maintenance run.";
					logger.warn({ npmLock }, message);
					artifactNotices.push({
						file: npmLock,
						message
					});
				}
				const existingContent = await getFile(npmLock, config.reuseExistingBranch ? config.branchName : config.baseBranch);
				if (res.lockFile === existingContent) logger.debug(`${npmLock} hasn't changed`);
				else {
					logger.debug(`${npmLock} needs updating`);
					updatedArtifacts.push({
						type: "addition",
						path: npmLock,
						contents: res.lockFile.replace(tokenRe, "")
					});
				}
			}
		});
	}
	for (const yarnLock of dirs.yarnLockDirs) {
		const lockFileDir = upath.dirname(yarnLock);
		let yarnRcYmlFilename;
		let existingYarnrcYmlContent;
		await withNpmrcHostRules(lockFileDir, additionalNpmrcContent, async () => {
			if (additionalYarnRcYml) {
				yarnRcYmlFilename = getSiblingFileName(yarnLock, ".yarnrc.yml");
				existingYarnrcYmlContent = await readLocalFile(yarnRcYmlFilename, "utf8");
				// v8 ignore else -- TODO: add test #40625
				if (existingYarnrcYmlContent) try {
					const existingYarnrRcYml = parseSingleYaml(existingYarnrcYmlContent);
					const updatedYarnYrcYml = merge(existingYarnrRcYml, fuzzyMatchAdditionalYarnrcYml(additionalYarnRcYml, existingYarnrRcYml));
					await writeLocalFile(yarnRcYmlFilename, dump(updatedYarnYrcYml));
					logger.debug("Added authentication to .yarnrc.yml");
				} catch (err) {
					logger.warn({ err }, "Error appending .yarnrc.yml content");
				}
			}
			logger.debug(`Generating yarn.lock for ${lockFileDir}`);
			const lockFileName = upath.join(lockFileDir, "yarn.lock");
			const upgrades = config.upgrades.filter((upgrade) => upgrade.managerData?.yarnLock === yarnLock);
			const res = await generateLockFile$2(lockFileDir, env, config, upgrades);
			if (res.error) {
				/* v8 ignore next -- needs test */
				if (res.stderr?.includes(`Couldn't find any versions for`)) {
					for (const upgrade of config.upgrades) if (res.stderr.includes(`Couldn't find any versions for \\"${upgrade.depName}\\"`)) {
						logger.debug({
							dependency: upgrade.depName,
							type: "yarn"
						}, "lock file failed for the dependency being updated - skipping branch creation");
						throw new ExternalHostError(/* @__PURE__ */ new Error("lock file failed for the dependency being updated - skipping branch creation"), NpmDatasource.id);
					}
				}
				artifactErrors.push({
					fileName: yarnLock,
					stderr: artifactErrorMessageFromExecError(res, "")
				});
			} else {
				const existingContent = await getFile(lockFileName, config.reuseExistingBranch ? config.branchName : config.baseBranch);
				if (res.lockFile === existingContent) logger.debug("yarn.lock hasn't changed");
				else {
					logger.debug("yarn.lock needs updating");
					updatedArtifacts.push({
						type: "addition",
						path: lockFileName,
						contents: res.lockFile
					});
					await updateYarnOffline(lockFileDir, updatedArtifacts);
				}
				/* v8 ignore next -- needs test */
				if (upgrades.some(isYarnUpdate)) existingYarnrcYmlContent = await updateYarnBinary(lockFileDir, updatedArtifacts, existingYarnrcYmlContent);
			}
		});
		/* v8 ignore next -- needs test */
		if (existingYarnrcYmlContent) await writeLocalFile(yarnRcYmlFilename, existingYarnrcYmlContent);
	}
	for (const pnpmLockFile of dirs.pnpmLockFileDirs) {
		const lockFileDir = upath.dirname(pnpmLockFile);
		await withNpmrcHostRules(lockFileDir, additionalNpmrcContent, async () => {
			logger.debug(`Generating pnpm-lock.yaml for ${lockFileDir}`);
			const upgrades = config.upgrades.filter((upgrade) => upgrade.managerData?.pnpmLockFile === pnpmLockFile);
			const res = await generateLockFile$1(lockFileDir, env, config, upgrades);
			if (res.error) {
				/* v8 ignore next -- needs test */
				if (res.stdout?.includes(`No compatible version found:`)) {
					for (const upgrade of config.upgrades) if (res.stdout.includes(`No compatible version found: ${upgrade.depName}`)) {
						logger.debug({
							dependency: upgrade.depName,
							type: "pnpm"
						}, "lock file failed for the dependency being updated - skipping branch creation");
						throw new ExternalHostError(Error("lock file failed for the dependency being updated - skipping branch creation"), NpmDatasource.id);
					}
				}
				artifactErrors.push({
					fileName: pnpmLockFile,
					stderr: artifactErrorMessageFromExecError(res, "")
				});
			} else {
				const existingContent = await getFile(pnpmLockFile, config.reuseExistingBranch ? config.branchName : config.baseBranch);
				if (res.lockFile === existingContent) logger.debug("pnpm-lock.yaml hasn't changed");
				else {
					logger.debug("pnpm-lock.yaml needs updating");
					updatedArtifacts.push({
						type: "addition",
						path: pnpmLockFile,
						contents: res.lockFile
					});
				}
			}
		});
	}
	return {
		artifactErrors,
		artifactNotices,
		updatedArtifacts
	};
}
async function getAdditionalFiles(config, packageFiles) {
	const originalNpmrcFiles = /* @__PURE__ */ new Map();
	try {
		return await getAdditionalFilesInner(config, packageFiles, originalNpmrcFiles);
	} finally {
		await restoreNpmrcFiles(originalNpmrcFiles);
	}
}
//#endregion
export { determineLockFileDirs, getAdditionalFiles, updateYarnBinary, writeExistingFiles, writeUpdatedPackageFiles };

//# sourceMappingURL=index.js.map