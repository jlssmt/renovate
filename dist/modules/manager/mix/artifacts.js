import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger } from "../../../logger/index.js";
import { find, getAll } from "../../../util/host-rules.js";
import { deleteLocalFile, ensureCacheDir, findLocalSiblingOrParent, getSiblingFileName, localPathExists, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactError, artifactErrorResult, fileAddition, resolveToolConstraint } from "../util.js";
import { isEmptyArray, isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/mix/artifacts.ts
const hexRepoUrl = "https://hex.pm/";
const hexRepoOrgUrlRegex = regEx(`^https://hex\\.pm/api/repos/(?<organization>[a-z0-9_]+)/$`);
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`mix.getArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (isEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated mix deps");
		return null;
	}
	let lockFileName = getSiblingFileName(packageFileName, "mix.lock");
	let isUmbrella = false;
	let existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent) {
		const lockFileError = await checkLockFileReadError(lockFileName);
		if (lockFileError) return lockFileError;
		const parentLockFileName = await findLocalSiblingOrParent(packageFileName, "mix.lock");
		existingLockFileContent = parentLockFileName && await readLocalFile(parentLockFileName, "utf8");
		if (parentLockFileName && existingLockFileContent) {
			lockFileName = parentLockFileName;
			isUmbrella = true;
		} else if (parentLockFileName) {
			const lockFileError = await checkLockFileReadError(parentLockFileName);
			// v8 ignore else -- needs an umbrella parent lock file that reads cleanly
			if (lockFileError) return lockFileError;
		}
	}
	if (isLockFileMaintenance && isUmbrella) {
		logger.debug(`Cannot use lockFileMaintenance in an umbrella project, see ${GlobalConfig.get("productLinks").documentation}modules/manager/mix/#lockFileMaintenance`);
		return null;
	}
	if (isLockFileMaintenance && !existingLockFileContent) {
		logger.debug("Cannot use lockFileMaintenance when no mix.lock file is present");
		return null;
	}
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		if (isLockFileMaintenance) await deleteLocalFile(lockFileName);
	} catch (err) {
		logger.warn({ err }, "mix.exs could not be written");
		return artifactErrorResult(lockFileName, err);
	}
	if (!existingLockFileContent) {
		logger.debug("No mix.lock found");
		return null;
	}
	const organizations = /* @__PURE__ */ new Set();
	const hexHostRulesWithMatchHost = getAll().filter((hostRule) => !!hostRule.matchHost && hexRepoOrgUrlRegex.test(hostRule.matchHost));
	for (const { matchHost } of hexHostRulesWithMatchHost)
 // v8 ignore else -- the filter above already required a match host
	if (matchHost) {
		const result = hexRepoOrgUrlRegex.exec(matchHost);
		// v8 ignore else -- the same regex already matched in that filter
		if (result?.groups) {
			const { organization } = result.groups;
			organizations.add(organization);
		}
	}
	for (const { packageName } of updatedDeps) if (packageName) {
		const [, organization] = packageName.split(":");
		// v8 ignore else -- needs an updated dep whose name carries no organization
		if (organization) organizations.add(organization);
	}
	const preCommands = Array.from(organizations).reduce((acc, organization) => {
		const url = `${hexRepoUrl}api/repos/${organization}/`;
		const { token } = find({ url });
		if (token) {
			logger.debug(`Authenticating to hex organization ${organization}`);
			const authCommand = `mix hex.organization auth ${quote(organization)} --key ${quote(token)}`;
			return [...acc, authCommand];
		}
		return acc;
	}, []);
	const execOptions = {
		extraEnv: { MIX_ARCHIVES: await ensureCacheDir("mix_archives") },
		cwdFile: lockFileName,
		docker: {},
		toolConstraints: [{
			toolName: "erlang",
			constraint: await resolveToolConstraint(config, "erlang") ?? `^26`
		}, {
			toolName: "elixir",
			constraint: await resolveToolConstraint(config, "elixir")
		}],
		preCommands
	};
	let command;
	if (isLockFileMaintenance) command = "mix deps.get";
	else command = [
		"mix",
		"deps.update",
		...updatedDeps.map((dep) => dep.depName).filter(isString).map((dep) => quote(dep))
	].join(" ");
	try {
		await exec(command, execOptions);
	} catch (err) {
		/* v8 ignore if -- defensive rethrow of TEMPORARY_ERROR from exec, not reproduced in mix specs */
		if (err.message === "temporary-error") throw err;
		logger.debug({
			err,
			message: err.message,
			command
		}, "Failed to update Mix lock file");
		return artifactErrorResult(lockFileName, err);
	}
	const newMixLockContent = await readLocalFile(lockFileName, "utf8");
	if (existingLockFileContent === newMixLockContent) {
		logger.debug("mix.lock is unchanged");
		return null;
	}
	logger.debug("Returning updated mix.lock");
	return [fileAddition(lockFileName, newMixLockContent)];
}
async function checkLockFileReadError(lockFileName) {
	if (await localPathExists(lockFileName)) return [artifactError(lockFileName, `Error reading ${lockFileName}`)];
	return null;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map