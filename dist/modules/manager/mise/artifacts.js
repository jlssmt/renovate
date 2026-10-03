import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/semver/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { findGithubToken } from "../../../util/check-token.js";
import { getConfigType, getLockFileName } from "./lockfile.js";
import { isNonEmptyStringAndNotWhitespace } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/mise/artifacts.ts
/**
* First mise release that supports the features this manager relies on:
* `MISE_SAFE=1` safe mode (a hard boundary against project config executing
* code during `mise lock`) and `mise lock --bump` (advancing fuzzy selectors).
*
* Safe mode (jdx/mise#11146) and lockfile bumping (jdx/mise#11145) merged after
* v2026.7.11 and first shipped in v2026.7.12.
*
* @see https://github.com/jdx/mise/pull/11146
* @see https://github.com/jdx/mise/pull/11145
* @see https://mise.jdx.dev/configuration/settings.html#safe
*/
const MISE_SAFE_MODE_MIN_VERSION = "2026.7.12";
/**
* Detects the mise version that will actually run, by executing `mise version`.
* `mise version` only prints the binary's version — it does not load or execute
* project configuration — so it is safe to run even without allowlisting.
*
* Output looks like `2026.7.12 macos-arm64 (2026-07-21)`; we take the leading
* `major.minor.patch`. Returns `null` if the probe fails or cannot be parsed,
* in which case callers fall back to the conservative (pre-safe-mode) behavior.
*/
async function detectMiseVersion(execOptions) {
	try {
		const { stdout } = await exec("mise version", execOptions);
		const version = regEx(/\d+\.\d+\.\d+/).exec(stdout)?.[0];
		if (version && api.isVersion(version)) return version;
		logger.debug({ stdout }, "Could not parse mise version output");
		return null;
	} catch (err) {
		logger.debug({ err }, "Failed to determine mise version");
		return null;
	}
}
/** True when `version` is at or above the safe-mode / `--bump` release. */
function versionSupportsSafeFeatures(version) {
	return !!version && (api.equals(version, MISE_SAFE_MODE_MIN_VERSION) || api.isGreaterThan(version, MISE_SAFE_MODE_MIN_VERSION));
}
/**
* Resolver tools that mise may invoke while running `mise lock`, for instance to convert an inexact version like `1` against the npm registry.
*
* NOTE: this will install all relevant tools, regardless of what the given mise configuration uses.
*
* In safe mode these are unnecessary: npm version listing uses mise's built-in
* registry HTTP client and go runs with `GOTOOLCHAIN=local`, so `mise lock`
* resolves versions over HTTP without shelling out to node/npm/ruby.
*
* @see https://mise.jdx.dev/dev-tools/backends/npm.html
* @see https://mise.jdx.dev/dev-tools/backends/go.html
* @see https://mise.jdx.dev/dev-tools/backends/gem.html
*/
async function getMiseLockToolConstraints(config, miseConstraint, safeMode = false) {
	const miseToolConstraint = {
		toolName: "mise",
		constraint: miseConstraint
	};
	if (safeMode) return [miseToolConstraint];
	return [
		miseToolConstraint,
		{
			toolName: "node",
			constraint: await resolveToolConstraint(config, "node")
		},
		{
			toolName: "npm",
			constraint: await resolveToolConstraint(config, "npm")
		},
		{
			toolName: "golang",
			constraint: await resolveToolConstraint(config, "go")
		},
		{
			toolName: "ruby",
			constraint: await resolveToolConstraint(config, "ruby")
		}
	];
}
/**
* Updates mise lock files when dependencies are updated.
* Runs `mise lock` for lock file maintenance or `mise lock <tools>` for targeted updates.
*/
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, newLockFileContent, config }) {
	const lockFileName = getLockFileName(packageFileName);
	const originalLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!(newLockFileContent ?? originalLockFileContent)) {
		logger.debug({ lockFileName }, "No mise lock file found");
		return null;
	}
	const miseAllowlisted = GlobalConfig.get("allowedUnsafeExecutions").includes("mise");
	const miseConstraint = await resolveToolConstraint(config, "mise");
	let miseSupportsSafeFeatures = false;
	if (!miseAllowlisted || config.isLockFileMaintenance) miseSupportsSafeFeatures = versionSupportsSafeFeatures(await detectMiseVersion({
		cwdFile: packageFileName,
		toolConstraints: [{
			toolName: "mise",
			constraint: miseConstraint
		}],
		docker: {}
	}));
	const safeMode = !miseAllowlisted && miseSupportsSafeFeatures;
	if (!miseAllowlisted && !safeMode) {
		logger.once.warn({ safeModeMinVersion: MISE_SAFE_MODE_MIN_VERSION }, "`mise lock` requires either `mise` in `allowedUnsafeExecutions`, or a mise version that supports safe mode");
		return null;
	}
	const { isLocal, env } = getConfigType(packageFileName);
	const localFlag = isLocal ? " --local" : "";
	let lockCmd;
	if (config.isLockFileMaintenance) lockCmd = `mise lock${localFlag}${miseSupportsSafeFeatures ? " --bump" : ""}`;
	else {
		const tools = updatedDeps.map(({ depName }) => depName).filter(isNonEmptyStringAndNotWhitespace).map(quote).join(" ");
		lockCmd = tools ? `mise lock${localFlag} ${tools}` : `mise lock${localFlag}`;
	}
	const extraEnv = {};
	if (env) extraEnv.MISE_ENV = env;
	if (safeMode) extraEnv.MISE_SAFE = "1";
	const token = findGithubToken(find({
		hostType: "github",
		url: "https://api.github.com/"
	}));
	if (token) extraEnv.GITHUB_TOKEN = token;
	const execOptions = {
		cwdFile: packageFileName,
		extraEnv,
		toolConstraints: await getMiseLockToolConstraints(config, miseConstraint, safeMode),
		docker: {}
	};
	const commands = safeMode ? [lockCmd] : [`mise trust ${quote(upath.basename(packageFileName))}`, lockCmd];
	try {
		if (newLockFileContent) await writeLocalFile(lockFileName, newLockFileContent);
		return await updateLockFile({
			lockFileName,
			existingLockFileContent: originalLockFileContent,
			packageFile: {
				path: packageFileName,
				contents: newPackageFileContent
			},
			run: () => exec(commands, execOptions)
		});
	} catch (err) {
		/* v8 ignore if -- defensive rethrow, not worth testing */
		if (err.message === "temporary-error") throw err;
		logger.warn({
			err,
			lockFileName
		}, "Error updating mise lock file");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map