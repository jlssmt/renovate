import { SYSTEM_INSUFFICIENT_DISK_SPACE } from "../../../constants/error-messages.js";
import { coerceObject } from "../../../util/object.js";
import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { coerceString } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { find, findAll } from "../../../util/host-rules.js";
import { deleteLocalFile, ensureCacheDir, ensureLocalDir, getSiblingFileName, localPathExists, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { Json } from "../../../util/schema-utils/index.js";
import { Lazy } from "../../../util/lazy.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { PackagistDatasource } from "../../datasource/packagist/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileAddition, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { findGithubToken, takePersonalAccessTokenIfPossible } from "../../../util/check-token.js";
import { Lockfile, PackageFile } from "./schema.js";
import { extractConstraints, getComposerArguments, getComposerUpdateArguments, isArtifactAuthEnabled, requireComposerDependencyInstallation } from "./utils.js";
import { isEmptyObject, isString } from "@sindresorhus/is";
import { z } from "zod/v4";
import { quote } from "shlex";
//#region lib/modules/manager/composer/artifacts.ts
function getAuthJson() {
	const authJson = {};
	const githubHostRule = find({
		hostType: "github",
		url: "https://api.github.com/"
	});
	const gitTagsHostRule = find({
		hostType: GitTagsDatasource.id,
		url: "https://github.com"
	});
	const selectedGithubToken = takePersonalAccessTokenIfPossible(isArtifactAuthEnabled(githubHostRule) ? findGithubToken(githubHostRule) : void 0, isArtifactAuthEnabled(gitTagsHostRule) ? findGithubToken(gitTagsHostRule) : void 0);
	if (selectedGithubToken) authJson["github-oauth"] = { "github.com": selectedGithubToken };
	for (const gitlabHostRule of findAll({ hostType: "gitlab" })) {
		if (!isArtifactAuthEnabled(gitlabHostRule)) continue;
		// v8 ignore else -- a rule without a token does not pass the check above
		if (gitlabHostRule?.token) {
			const host = coerceString(gitlabHostRule.resolvedHost, "gitlab.com");
			authJson["gitlab-token"] = coerceObject(authJson["gitlab-token"]);
			authJson["gitlab-token"][host] = gitlabHostRule.token;
			authJson["gitlab-domains"] = [host, ...coerceArray(authJson["gitlab-domains"])];
		}
	}
	for (const packagistHostRule of findAll({ hostType: PackagistDatasource.id })) {
		if (!isArtifactAuthEnabled(packagistHostRule)) continue;
		const { resolvedHost, username, password, token } = packagistHostRule;
		if (resolvedHost && username && password) {
			authJson["http-basic"] = coerceObject(authJson["http-basic"]);
			authJson["http-basic"][resolvedHost] = {
				username,
				password
			};
		} else if (resolvedHost && token) {
			authJson.bearer = coerceObject(authJson.bearer);
			authJson.bearer[resolvedHost] = token;
		}
	}
	return isEmptyObject(authJson) ? null : JSON.stringify(authJson);
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`composer.updateArtifacts(${packageFileName})`);
	const file = Json.pipe(PackageFile).parse(newPackageFileContent);
	const lockFileName = packageFileName.replace(regEx(/\.json$/), ".lock");
	const lockfile = await z.string().transform((f) => readLocalFile(f, "utf8")).pipe(Json).pipe(Lockfile).nullable().catch(null).parseAsync(lockFileName);
	if (!lockfile) {
		logger.debug("Composer: unable to read lockfile");
		return null;
	}
	const vendorDir = getSiblingFileName(packageFileName, "vendor");
	const commitVendorFiles = await localPathExists(vendorDir);
	await ensureLocalDir(vendorDir);
	try {
		await writeLocalFile(packageFileName, newPackageFileContent);
		const fileConstraints = new Lazy(() => extractConstraints(file, lockfile));
		const composerToolConstraint = {
			toolName: "composer",
			constraint: await resolveToolConstraint(config, "composer", () => fileConstraints.getValue().composer)
		};
		const phpToolConstraint = {
			toolName: "php",
			constraint: await resolveToolConstraint(config, "php", () => fileConstraints.getValue().php)
		};
		const execOptions = {
			cwdFile: packageFileName,
			extraEnv: {
				COMPOSER_CACHE_DIR: await ensureCacheDir("composer"),
				COMPOSER_AUTH: getAuthJson()
			},
			toolConstraints: [phpToolConstraint, composerToolConstraint],
			docker: {}
		};
		const commands = [];
		if (requireComposerDependencyInstallation(lockfile)) {
			const preCmd = "composer";
			const preArgs = `install${getComposerArguments(config, composerToolConstraint)}`;
			logger.trace({
				preCmd,
				preArgs
			}, "composer pre-update command");
			commands.push("git stash -- composer.json");
			commands.push(`${preCmd} ${preArgs}`);
			commands.push({
				command: [
					"git",
					"stash",
					"pop"
				],
				ignoreFailure: true
			});
		}
		if (config.isLockFileMaintenance) {
			logger.debug(`Removing ${lockFileName} first due to lock file maintenance upgrade`);
			await deleteLocalFile(lockFileName);
		}
		const cmd = "composer";
		let args;
		if (config.isLockFileMaintenance) args = "update";
		else args = ("update " + updatedDeps.map((dep) => dep.newVersion ? quote(`${dep.depName}:${dep.newVersion}`) : quote(dep.depName)).filter(isString).map((dep) => quote(dep)).join(" ")).trim() + (config.postUpdateOptions?.includes("composerWithAll") ? " --with-all-dependencies" : " --with-dependencies");
		args += getComposerUpdateArguments(config, composerToolConstraint);
		logger.trace({
			cmd,
			args
		}, "composer command");
		commands.push(`${cmd} ${args}`);
		await exec(commands, execOptions);
		const status = await getRepoStatus();
		if (!status.modified.includes(lockFileName)) return null;
		logger.debug("Returning updated composer.lock");
		const res = [fileAddition(lockFileName, await readLocalFile(lockFileName))];
		if (!commitVendorFiles) return res;
		logger.debug(`Committing vendor files in ${vendorDir}`);
		res.push(...fileChangesToArtifactResults([...await collectFileChanges(status, {
			include: ["modified", "not_added"],
			filter: (f) => f.startsWith(vendorDir)
		}), ...await collectFileChanges(status, { include: ["deleted"] })]));
		return res;
	} catch (err) {
		// istanbul ignore if
		if (err.message === "temporary-error") throw err;
		if (err.message?.includes("Your requirements could not be resolved to an installable set of packages.")) logger.info("Composer requirements cannot be resolved");
		else if (err.message?.includes("write error (disk full?)")) throw new Error(SYSTEM_INSUFFICIENT_DISK_SPACE);
		else logger.debug({ err }, "Failed to generate composer.lock");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map