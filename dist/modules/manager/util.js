import { logger } from "../../logger/index.js";
import { detectPlatform } from "../../util/common.js";
import { deleteLocalFile, readLocalFile, writeLocalFile } from "../../util/fs/index.js";
import { parseGitUrl } from "../../util/git/url.js";
import { GitRefsDatasource } from "../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../datasource/gitlab-tags/index.js";
import { isNonEmptyString } from "@sindresorhus/is";
//#region lib/modules/manager/util.ts
function applyGitSource(dep, git, rev, tag, branch) {
	if (tag) {
		const platform = detectPlatform(git);
		if (platform === "github" || platform === "gitlab") {
			dep.datasource = platform === "github" ? GithubTagsDatasource.id : GitlabTagsDatasource.id;
			const { host, full_name } = parseGitUrl(git);
			dep.registryUrls = [`https://${host}`];
			dep.packageName = full_name;
		} else {
			dep.datasource = GitTagsDatasource.id;
			dep.packageName = git;
		}
		dep.currentValue = tag;
		dep.skipReason = void 0;
	} else if (rev) {
		dep.datasource = GitRefsDatasource.id;
		dep.packageName = git;
		dep.currentDigest = rev;
		dep.replaceString = rev;
		dep.skipReason = void 0;
	} else {
		dep.datasource = GitRefsDatasource.id;
		dep.packageName = git;
		dep.currentValue = branch;
		dep.skipReason = branch ? "git-dependency" : "unspecified-version";
	}
}
/**
* Given an {@link ExecError}, retrieve the message which will be used for an {@link ArtifactError}.
*
* An `ExecError` always carries a `stderr` property, so nullish coalescing would keep an empty string and render an artifact error with no message at all.
*
*/
function artifactErrorMessageFromExecError(err, message) {
	if (err.stderr?.trim()) return err.stderr;
	if (err.stdout?.trim()) return err.stdout;
	return message;
}
/**
* Wraps {@link FileChange}s, e.g. the result of `collectFileChanges()`, into the
* result shape returned by `updateArtifacts()`.
*/
function fileChangesToArtifactResults(changes) {
	return changes.map((file) => ({ file }));
}
/**
* Resolve the constraint for a tool that `updateArtifacts()` has to run.
*
* The precedence is:
*
* 1. `constraints`, because the user asked for it explicitly
* 2. `derive`, because it reads the package files as the branch changed them,
*    so it can be newer than what extraction saw
* 3. `extractedConstraints`, as collected while extracting the base branch
*
* Managers that have no way to derive the constraint at artifact time can omit
* `derive`. An empty string counts as "not set" at every step, so it never
* shadows a value further down the list.
*
* This is the only place that reads `constraints` and `extractedConstraints`
* from the config; the `renovate/prefer-resolve-tool-constraint` lint rule
* keeps managers from reading them directly.
*/
async function resolveToolConstraint(config, toolName, derive) {
	const configured = config.constraints?.[toolName];
	if (isNonEmptyString(configured)) return configured;
	const derived = await derive?.();
	if (isNonEmptyString(derived)) return derived;
	const extracted = config.extractedConstraints?.[toolName];
	return isNonEmptyString(extracted) ? extracted : void 0;
}
/**
* The result which reports `path` as created or updated.
*/
function fileAddition(path, contents) {
	return { file: {
		type: "addition",
		path,
		contents
	} };
}
/**
* The result which reports a failed artifact update to the user.
*/
function artifactError(fileName, stderr) {
	return { artifactError: {
		fileName,
		stderr
	} };
}
/**
* The result for an artifact update which threw, using the most informative
* output the error carries. Callers are expected to have rethrown
* `TEMPORARY_ERROR` and logged the error before calling this.
*/
function artifactErrorResult(fileName, err) {
	return [artifactError(fileName, artifactErrorMessageFromExecError(err, err.message))];
}
/**
* The skeleton shared by the managers which regenerate a single lock file:
* rewrite the package file, optionally drop the lock file, run the package
* manager and return the lock file when its content changed.
*
* Errors from `run()` are not handled here - callers keep their own logging and
* pass the error to {@link artifactErrorResult}.
*/
async function updateLockFile({ lockFileName, existingLockFileContent, packageFile, deleteLockFile, run }) {
	if (packageFile) await writeLocalFile(packageFile.path, packageFile.contents);
	if (deleteLockFile) await deleteLocalFile(lockFileName);
	await run();
	const newLockFileContent = await readLockFile(lockFileName, Buffer.isBuffer(existingLockFileContent));
	if (!newLockFileContent) {
		logger.debug(`No ${lockFileName} found`);
		return null;
	}
	if (isSameContent(existingLockFileContent, newLockFileContent)) {
		logger.debug(`${lockFileName} is unchanged`);
		return null;
	}
	return [fileAddition(lockFileName, newLockFileContent)];
}
function readLockFile(lockFileName, asBuffer) {
	return asBuffer ? readLocalFile(lockFileName) : readLocalFile(lockFileName, "utf8");
}
function isSameContent(before, after) {
	if (Buffer.isBuffer(before) && Buffer.isBuffer(after)) return before.equals(after);
	return before === after;
}
//#endregion
export { applyGitSource, artifactError, artifactErrorMessageFromExecError, artifactErrorResult, fileAddition, fileChangesToArtifactResults, resolveToolConstraint, updateLockFile };

//# sourceMappingURL=util.js.map