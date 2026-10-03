import { SYSTEM_INSUFFICIENT_DISK_SPACE } from "../../../../constants/error-messages.js";
import { regEx } from "../../../../util/regex.js";
import { GlobalConfig } from "../../../../config/global.js";
import { minimatch } from "../../../../util/minimatch.js";
import { logger } from "../../../../logger/index.js";
import { toMs } from "../../../../util/pretty-time.js";
import { trimSlashes } from "../../../../util/url.js";
import { deleteLocalFile, localPathExists, readLocalFile, renameLocalFile } from "../../../../util/fs/index.js";
import { Result } from "../../../../util/result.js";
import { exec, getToolSettingsOptions } from "../../../../util/exec/index.js";
import { resolveToolConstraint } from "../../util.js";
import { getNodeToolConstraint } from "./node-version.js";
import { PackageLock } from "../schema.js";
import { composeLockFile, parseLockFile } from "../utils.js";
import { getNodeOptions, getPackageManagerVersion, lazyLoadPackageJson } from "./utils.js";
import { isNonEmptyString, isNumber, isString } from "@sindresorhus/is";
import { DateTime } from "luxon";
import { quote } from "shlex";
import upath from "upath";
import ini from "ini";
import semver from "semver";
//#region lib/modules/manager/npm/post-update/npm.ts
function parseNpmrcCooldownDate(npmrcContent) {
	if (!npmrcContent) return null;
	const parsed = ini.parse(npmrcContent);
	const before = parsed.before;
	if (isNonEmptyString(before)) {
		const dt = DateTime.fromISO(before, { zone: "utc" });
		if (dt.isValid) return {
			date: dt,
			source: "before"
		};
		logger.debug(`Invalid before date in .npmrc: ${before}, ignoring`);
	}
	const minReleaseAge = parsed["min-release-age"];
	if (isNonEmptyString(minReleaseAge)) {
		const days = parseInt(minReleaseAge, 10);
		if (isNumber(days) && days >= 0) return {
			date: DateTime.now().minus({ days }).toUTC(),
			source: "min-release-age"
		};
		logger.debug(`Invalid min-release-age in .npmrc: ${minReleaseAge}, ignoring`);
	}
	return null;
}
async function getNpmConstraintFromPackageLock(lockFileDir, filename) {
	const packageLockFileName = upath.join(lockFileDir, filename);
	const packageLockContents = await readLocalFile(packageLockFileName, "utf8");
	const packageLockJson = Result.parse(packageLockContents, PackageLock).unwrapOrNull();
	if (!packageLockJson) {
		logger.debug(`Could not parse ${packageLockFileName}`);
		return null;
	}
	const { lockfileVersion } = packageLockJson;
	if (lockfileVersion === 1) {
		logger.debug(`Using npm constraint <7 for lockfileVersion=1`);
		return `<7`;
	}
	if (lockfileVersion === 2) {
		logger.debug(`Using npm constraint <9 for lockfileVersion=2`);
		return `<9`;
	}
	return null;
}
async function generateLockFile(lockFileDir, env, filename, config = {}, upgrades = [], npmrcContent = null) {
	const lockFileName = upath.join(lockFileDir, filename);
	logger.debug(`Spawning npm install to create ${lockFileDir}/${filename}`);
	const { skipInstalls, postUpdateOptions } = config;
	let lockFile = null;
	let beforeFallback = false;
	try {
		const lazyPkgJson = lazyLoadPackageJson(lockFileDir);
		const npmToolConstraint = {
			toolName: "npm",
			constraint: await resolveToolConstraint(config, "npm", async () => getPackageManagerVersion("npm", await lazyPkgJson.getValue()) ?? await getNpmConstraintFromPackageLock(lockFileDir, filename)) ?? null
		};
		const supportsPreferDedupeFlag = !npmToolConstraint.constraint || semver.intersects(">=7.0.0", npmToolConstraint.constraint);
		let commands = [];
		let cmdOptions = "";
		if (postUpdateOptions?.includes("npmDedupe") === true && !supportsPreferDedupeFlag || skipInstalls === false) {
			logger.debug("Performing node_modules install");
			cmdOptions += "--no-audit";
		} else {
			logger.debug("Updating lock file only");
			cmdOptions += "--package-lock-only --no-audit";
		}
		if (postUpdateOptions?.includes("npmDedupe") && supportsPreferDedupeFlag) {
			logger.debug("Deduplicate dependencies on installation");
			cmdOptions += " --prefer-dedupe";
		}
		if (!GlobalConfig.get("allowScripts") || config.ignoreScripts) cmdOptions += " --ignore-scripts";
		let beforeFlag = "";
		if (config.minimumReleaseAge) {
			const ms = toMs(config.minimumReleaseAge);
			if (ms === null) logger.debug({ minimumReleaseAge: config.minimumReleaseAge }, "Invalid minimumReleaseAge, skipping --before for npm install");
			else {
				const npmrcCooldown = parseNpmrcCooldownDate(npmrcContent);
				if (npmrcCooldown?.source === "min-release-age") logger.debug({
					npmrcMinReleaseAge: npmrcCooldown.date.toISO(),
					minimumReleaseAge: config.minimumReleaseAge
				}, "Skipping --before flag because .npmrc already contains min-release-age");
				else {
					let beforeDate = DateTime.now().minus(ms).toUTC();
					if (npmrcCooldown && npmrcCooldown.date < beforeDate) {
						logger.debug({
							npmrcDate: npmrcCooldown.date.toISO(),
							beforeDate: beforeDate.toISO()
						}, "Using stricter .npmrc cooldown date over minimumReleaseAge date");
						beforeDate = npmrcCooldown.date;
					}
					const beforeISO = beforeDate.toISO();
					logger.debug({
						beforeISO,
						minimumReleaseAge: config.minimumReleaseAge
					}, "Setting npm --before based on minimumReleaseAge");
					beforeFlag = ` --before=${beforeISO}`;
				}
			}
		}
		const extraEnv = {
			NPM_CONFIG_CACHE: env.NPM_CONFIG_CACHE,
			npm_config_store: env.npm_config_store
		};
		const { nodeMaxMemory } = getToolSettingsOptions(config.toolSettings);
		if (nodeMaxMemory) extraEnv.NODE_OPTIONS = getNodeOptions(nodeMaxMemory);
		const execOptions = {
			cwdFile: lockFileName,
			extraEnv,
			toolConstraints: [await getNodeToolConstraint(config, upgrades, lockFileDir, lazyPkgJson), ...isNonEmptyString(npmToolConstraint.constraint) ? [npmToolConstraint] : []],
			docker: {}
		};
		/* v8 ignore next -- needs test */
		if (GlobalConfig.get("exposeAllEnv")) {
			extraEnv.NPM_AUTH = env.NPM_AUTH;
			extraEnv.NPM_EMAIL = env.NPM_EMAIL;
		}
		if (!upgrades.every((upgrade) => upgrade.isLockfileUpdate)) commands.push(`npm install ${cmdOptions}${beforeFlag}`.trim());
		const lockUpdates = upgrades.filter((upgrade) => upgrade.isLockfileUpdate);
		const { lockRootUpdates, lockWorkspacesUpdates, workspaces, rootDeps } = divideWorkspaceAndRootDeps(lockFileDir, lockUpdates);
		if (workspaces.size && lockWorkspacesUpdates.length) {
			logger.debug("Performing lockfileUpdate (npm-workspaces)");
			for (const workspace of workspaces) {
				const currentWorkspaceUpdates = lockWorkspacesUpdates.filter((update) => update.workspace === workspace).map((update) => update.managerData?.packageKey).filter((packageKey) => !rootDeps.has(packageKey));
				// v8 ignore else -- TODO: add test #40625
				if (currentWorkspaceUpdates.length) {
					const updateCmd = `npm install ${cmdOptions}${beforeFlag} --workspace=${quote(workspace)} ${currentWorkspaceUpdates.map(quote).join(" ")}`;
					commands.push(updateCmd);
				}
			}
		}
		if (lockRootUpdates.length) {
			logger.debug("Performing lockfileUpdate (npm)");
			const updateCmd = `npm install ${cmdOptions}${beforeFlag} ${lockRootUpdates.map((update) => update.managerData?.packageKey).map(quote).join(" ")}`;
			commands.push(updateCmd);
		}
		if (upgrades.some((upgrade) => upgrade.isRemediation)) commands.push(`npm install ${cmdOptions}${beforeFlag}`.trim());
		if (upgrades.some((upgrade) => upgrade.isLockFileMaintenance) && !postUpdateOptions?.includes("npmInstallTwice")) commands.push(`npm install ${cmdOptions}${beforeFlag}`.trim());
		if (config.postUpdateOptions?.includes("npmDedupe") && !supportsPreferDedupeFlag) {
			logger.debug("Performing npm dedupe after installation");
			commands.push("npm dedupe");
		}
		if (upgrades.find((upgrade) => upgrade.isLockFileMaintenance)) {
			logger.debug(`Removing ${lockFileName} first due to lock file maintenance upgrade`);
			try {
				await deleteLocalFile(lockFileName);
			} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
				logger.debug({
					err,
					lockFileName
				}, "Error removing `package-lock.json` for lock file maintenance");
			}
		}
		if (postUpdateOptions?.includes("npmInstallTwice")) {
			logger.debug("Running npm install twice");
			const existingCommands = [...commands];
			commands = [];
			for (const command of existingCommands) {
				commands.push(command);
				// v8 ignore else -- TODO: add test #40625
				if (command.startsWith("npm install")) commands.push(command);
			}
		}
		await exec(commands, execOptions).catch(async (err) => {
			if (beforeFlag && err.stderr?.includes("with a date before")) {
				logger.debug("npm --before caused ETARGET, retrying without --before");
				const commandsWithoutBefore = commands.map((cmd) => cmd.replace(beforeFlag, ""));
				beforeFallback = true;
				return exec(commandsWithoutBefore, execOptions);
			}
			throw err;
		});
		if (filename === "npm-shrinkwrap.json" && await localPathExists(upath.join(lockFileDir, "package-lock.json"))) await renameLocalFile(upath.join(lockFileDir, "package-lock.json"), upath.join(lockFileDir, "npm-shrinkwrap.json"));
		lockFile = await readLocalFile(upath.join(lockFileDir, filename), "utf8");
		if (lockUpdates.length) {
			const { detectedIndent, lockFileParsed } = parseLockFile(lockFile);
			if (lockFileParsed?.lockfileVersion === 2 || lockFileParsed?.lockfileVersion === 3) {
				lockUpdates.forEach((lockUpdate) => {
					const depType = lockUpdate.depType;
					// v8 ignore else -- TODO: add test #40625
					if (lockFileParsed.packages?.[""]?.[depType]?.[lockUpdate.packageName]) lockFileParsed.packages[""][depType][lockUpdate.packageName] = lockUpdate.newValue;
				});
				lockFile = composeLockFile(lockFileParsed, detectedIndent);
			}
		}
	} catch (err) {
		// v8 ignore if -- TODO: add test #40625
		if (err.message === "temporary-error") throw err;
		logger.debug({
			err,
			type: "npm"
		}, "lock file error");
		// v8 ignore if -- TODO: add test #40625
		if (err.stderr?.includes("ENOSPC: no space left on device")) throw new Error(SYSTEM_INSUFFICIENT_DISK_SPACE);
		return {
			error: true,
			stderr: err.stderr
		};
	}
	return {
		error: !lockFile,
		lockFile,
		beforeFallback
	};
}
function divideWorkspaceAndRootDeps(lockFileDir, lockUpdates) {
	const lockRootUpdates = [];
	const lockWorkspacesUpdates = [];
	const workspaces = /* @__PURE__ */ new Set();
	const rootDeps = /* @__PURE__ */ new Set();
	for (const upgrade of lockUpdates) {
		upgrade.managerData ??= {};
		upgrade.managerData.packageKey = generatePackageKey(upgrade.packageName, upgrade.newVersion);
		if (upgrade.managerData.workspacesPackages?.length && isString(upgrade.packageFile)) {
			const workspacePatterns = upgrade.managerData.workspacesPackages;
			const packageFileDir = trimSlashes(upgrade.packageFile.replace("package.json", ""));
			const workspaceDir = trimSlashes(packageFileDir.startsWith(lockFileDir) ? packageFileDir.slice(lockFileDir.length) : packageFileDir);
			if (isNonEmptyString(workspaceDir)) {
				let workspaceName;
				for (const workspacePattern of workspacePatterns) {
					const massagedPattern = workspacePattern.replace(regEx(/^\.\//), "");
					if (minimatch(massagedPattern).match(workspaceDir)) {
						workspaceName = workspaceDir;
						break;
					}
				}
				if (workspaceName) {
					// v8 ignore else -- TODO: add test #40625
					if (!rootDeps.has(upgrade.managerData.packageKey)) {
						workspaces.add(workspaceName);
						upgrade.workspace = workspaceName;
						lockWorkspacesUpdates.push(upgrade);
					}
				} else logger.warn({
					workspacePatterns,
					workspaceDir
				}, "workspaceDir not found");
				continue;
			}
		}
		lockRootUpdates.push(upgrade);
		rootDeps.add(upgrade.managerData.packageKey);
	}
	return {
		lockRootUpdates,
		lockWorkspacesUpdates,
		workspaces,
		rootDeps
	};
}
function generatePackageKey(packageName, version) {
	return `${packageName}@${version}`;
}
//#endregion
export { divideWorkspaceAndRootDeps, generateLockFile, parseNpmrcCooldownDate };

//# sourceMappingURL=npm.js.map