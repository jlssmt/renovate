import { SYSTEM_INSUFFICIENT_DISK_SPACE } from "../../../../constants/error-messages.js";
import { coerceObject } from "../../../../util/object.js";
import { getEnv } from "../../../../util/env.js";
import { newlineRegex, regEx } from "../../../../util/regex.js";
import { GlobalConfig } from "../../../../config/global.js";
import { uniqueStrings } from "../../../../util/string.js";
import { logger } from "../../../../logger/index.js";
import { ExternalHostError } from "../../../../types/errors/external-host-error.js";
import { localPathIsFile, readLocalFile, writeLocalFile } from "../../../../util/fs/index.js";
import { exec, getToolSettingsOptions } from "../../../../util/exec/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { resolveToolConstraint } from "../../util.js";
import { getNodeToolConstraint } from "./node-version.js";
import { getNodeOptions, getPackageManagerVersion, lazyLoadPackageJson } from "./utils.js";
import { getYarnLock, getYarnVersionFromLock } from "../extract/yarn.js";
import { isString } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
import semver from "semver";
//#region lib/modules/manager/npm/post-update/yarn.ts
async function checkYarnrc(lockFileDir) {
	let offlineMirror = false;
	let yarnPath = null;
	try {
		const yarnrc = await readLocalFile(upath.join(lockFileDir, ".yarnrc"), "utf8");
		if (isString(yarnrc)) {
			offlineMirror = !!yarnrc.split(newlineRegex).find((line) => line.startsWith("yarn-offline-mirror "));
			const pathLine = yarnrc.split(newlineRegex).find((line) => line.startsWith("yarn-path "));
			if (pathLine) yarnPath = pathLine.replace(regEx(/^yarn-path\s+"?(?<path>.+?)"?$/), "$<path>");
			if (yarnPath) yarnPath = upath.join(lockFileDir, yarnPath);
			const yarnBinaryExists = yarnPath ? await localPathIsFile(yarnPath) : false;
			let scrubbedYarnrc = yarnrc.replace("--install.pure-lockfile true", "").replace("--install.frozen-lockfile true", "");
			if (!yarnBinaryExists) {
				scrubbedYarnrc = scrubbedYarnrc.replace(regEx(/^yarn-path\s+"?.+?"?$/gm), "");
				yarnPath = null;
			}
			if (yarnrc !== scrubbedYarnrc) {
				logger.debug(`Writing scrubbed .yarnrc to ${lockFileDir}`);
				await writeLocalFile(upath.join(lockFileDir, ".yarnrc"), scrubbedYarnrc);
			}
		}
	} catch {}
	return {
		offlineMirror,
		yarnPath
	};
}
function getOptimizeCommand(fileName) {
	return [
		"sed",
		"-i",
		"s/ steps,/ steps.slice(0,1),/",
		fileName
	];
}
function isYarnUpdate(upgrade) {
	return upgrade.depType === "packageManager" && upgrade.depName === "yarn";
}
async function generateLockFile(lockFileDir, env, config = {}, upgrades = []) {
	const lockFileName = upath.join(lockFileDir, "yarn.lock");
	logger.debug(`Spawning yarn install to create ${lockFileName}`);
	let lockFile = null;
	try {
		const lazyPgkJson = lazyLoadPackageJson(lockFileDir);
		const toolConstraints = [await getNodeToolConstraint(config, upgrades, lockFileDir, lazyPgkJson)];
		const yarnUpdate = upgrades.find(isYarnUpdate);
		const yarnCompatibility = yarnUpdate?.newValue ?? await resolveToolConstraint(config, "yarn", async () => getPackageManagerVersion("yarn", await lazyPgkJson.getValue()) ?? getYarnVersionFromLock(await getYarnLock(lockFileName)));
		const yarnRange = semver.validRange(yarnCompatibility);
		const minYarnVersion = yarnRange && semver.minVersion(yarnRange);
		const isYarn1 = !minYarnVersion || minYarnVersion.major === 1;
		const isYarnDedupeAvailable = minYarnVersion && semver.gte(minYarnVersion, "2.2.0");
		const isYarnModeAvailable = minYarnVersion && semver.gte(minYarnVersion, "3.0.0");
		const yarnTool = {
			toolName: "yarn",
			constraint: "^1.22.18"
		};
		const hasPackageManager = !!config.managerData?.hasPackageManager || !!upgrades[0]?.managerData?.hasPackageManager;
		if (!isYarn1 && hasPackageManager) toolConstraints.push({
			toolName: "corepack",
			constraint: await resolveToolConstraint(config, "corepack")
		});
		else {
			toolConstraints.push(yarnTool);
			if (isYarn1 && minYarnVersion) yarnTool.constraint = yarnCompatibility;
		}
		const extraEnv = {
			NPM_CONFIG_CACHE: env.NPM_CONFIG_CACHE,
			npm_config_store: env.npm_config_store
		};
		const commands = [];
		let cmdOptions = "";
		if (config.skipInstalls !== false) {
			if (isYarn1) {
				const { offlineMirror, yarnPath } = await checkYarnrc(lockFileDir);
				// v8 ignore else -- TODO: add test #40625
				if (!offlineMirror) {
					logger.debug("Updating yarn.lock only - skipping node_modules");
					yarnTool.toolName = "yarn-slim";
					if (yarnPath) commands.push({
						command: getOptimizeCommand(yarnPath),
						ignoreFailure: true
					});
				}
			} else if (isYarnModeAvailable) cmdOptions += " --mode=update-lockfile";
		}
		if (isYarn1) {
			cmdOptions += " --ignore-engines --ignore-platform --network-timeout 100000";
			extraEnv.YARN_CACHE_FOLDER = env.YARN_CACHE_FOLDER;
		} else {
			extraEnv.YARN_ENABLE_IMMUTABLE_INSTALLS = "false";
			extraEnv.YARN_HTTP_TIMEOUT = "100000";
			extraEnv.YARN_GLOBAL_FOLDER = env.YARN_GLOBAL_FOLDER;
			if (!config.managerData?.yarnZeroInstall) {
				logger.debug("Enabling global cache as zero-install is not detected");
				extraEnv.YARN_ENABLE_GLOBAL_CACHE = "1";
			}
		}
		if (!GlobalConfig.get("allowScripts") || config.ignoreScripts) {
			if (isYarn1) cmdOptions += " --ignore-scripts";
			else if (isYarnModeAvailable) {
				if (config.skipInstalls === false) cmdOptions += " --mode=skip-build";
			} else extraEnv.YARN_ENABLE_SCRIPTS = "0";
		}
		const { nodeMaxMemory } = getToolSettingsOptions(config.toolSettings);
		if (nodeMaxMemory) extraEnv.NODE_OPTIONS = getNodeOptions(nodeMaxMemory);
		const execOptions = {
			cwdFile: lockFileName,
			extraEnv,
			docker: {},
			toolConstraints
		};
		/* v8 ignore next -- needs test */
		if (GlobalConfig.get("exposeAllEnv")) {
			extraEnv.NPM_AUTH = env.NPM_AUTH;
			extraEnv.NPM_EMAIL = env.NPM_EMAIL;
		}
		if (yarnUpdate && !isYarn1) {
			logger.debug("Updating Yarn binary");
			commands.push(`yarn set version ${quote(yarnUpdate.newValue)}`);
		}
		const allEnv = getEnv();
		if (allEnv.RENOVATE_X_YARN_PROXY) {
			// v8 ignore else -- TODO: add test #40625
			if (allEnv.HTTP_PROXY && !isYarn1) {
				commands.push("yarn config unset --home httpProxy");
				commands.push(`yarn config set --home httpProxy ${quote(allEnv.HTTP_PROXY)}`);
			}
			// v8 ignore else -- TODO: add test #40625
			if (allEnv.HTTPS_PROXY && !isYarn1) {
				commands.push("yarn config unset --home httpsProxy");
				commands.push(`yarn config set --home httpsProxy ${quote(allEnv.HTTPS_PROXY)}`);
			}
		}
		commands.push(`yarn install${cmdOptions}`);
		const lockUpdates = upgrades.filter((upgrade) => upgrade.isLockfileUpdate);
		if (lockUpdates.length) {
			logger.debug("Performing lockfileUpdate (yarn)");
			if (isYarn1) commands.push(`yarn upgrade ${lockUpdates.map((update) => update.depName).filter(isString).filter(uniqueStrings).map(quote).join(" ")}${cmdOptions}`);
			else commands.push(`yarn up -R ${lockUpdates.map((update) => `${update.depName}`).filter(uniqueStrings).map(quote).join(" ")}${cmdOptions}`);
		}
		["fewer", "highest"].forEach((s) => {
			if (config.postUpdateOptions?.includes(`yarnDedupe${s.charAt(0).toUpperCase()}${s.slice(1)}`)) {
				logger.debug(`Performing yarn dedupe ${s}`);
				if (isYarn1) {
					commands.push(`npx yarn-deduplicate --strategy ${s}`);
					commands.push(`yarn install${cmdOptions}`);
				} else if (isYarnDedupeAvailable && s === "highest") commands.push(`yarn dedupe --strategy ${s}${cmdOptions}`);
				else logger.debug(`yarn dedupe ${s} not available`);
			}
		});
		if (upgrades.find((upgrade) => upgrade.isLockFileMaintenance)) {
			logger.debug(`Removing ${lockFileName} first due to lock file maintenance upgrade`);
			try {
				await writeLocalFile(lockFileName, "");
			} catch (err) {
				// v8 ignore next -- TODO: add test #40625
				logger.debug({
					err,
					lockFileName
				}, "Error clearing `yarn.lock` for lock file maintenance");
			}
		}
		await exec(commands, execOptions);
		lockFile = await readLocalFile(lockFileName, "utf8");
	} catch (err) {
		// v8 ignore if -- TODO: add test #40625
		if (err.message === "temporary-error") throw err;
		logger.debug({
			err,
			type: "yarn"
		}, "lock file error");
		const stdouterr = String(err.stdout) + String(err.stderr);
		// v8 ignore if -- TODO: add test #40625
		if (stdouterr.includes("ENOSPC: no space left on device") || stdouterr.includes("Out of diskspace")) throw new Error(SYSTEM_INSUFFICIENT_DISK_SPACE);
		// v8 ignore if -- TODO: add test #40625
		if (stdouterr.includes("The registry may be down.") || stdouterr.includes("getaddrinfo ENOTFOUND registry.yarnpkg.com") || stdouterr.includes("getaddrinfo ENOTFOUND registry.npmjs.org")) throw new ExternalHostError(err, NpmDatasource.id);
		return {
			error: true,
			stderr: err.stderr,
			stdout: err.stdout
		};
	}
	return { lockFile };
}
function fuzzyMatchAdditionalYarnrcYml(additionalYarnRcYml, existingYarnrRcYml) {
	const keys = new Map(Object.keys(coerceObject(existingYarnrRcYml.npmRegistries)).map((x) => [x.replace(regEx(/\/$/), "").replace(regEx(/^https?:/), ""), x]));
	return {
		...additionalYarnRcYml,
		npmRegistries: Object.entries(coerceObject(additionalYarnRcYml.npmRegistries)).map(([k, v]) => {
			return { [keys.get(k.replace(regEx(/\/$/), "")) ?? k]: v };
		}).reduce((acc, cur) => ({
			...acc,
			...cur
		}), {})
	};
}
//#endregion
export { checkYarnrc, fuzzyMatchAdditionalYarnrcYml, generateLockFile, getOptimizeCommand, isYarnUpdate };

//# sourceMappingURL=yarn.js.map