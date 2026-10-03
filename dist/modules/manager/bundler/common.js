import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, localPathExists, readLocalFile } from "../../../util/fs/index.js";
import { resolveToolConstraint } from "../util.js";
//#region lib/modules/manager/bundler/common.ts
const delimiters = ["\"", "'"];
function extractRubyVersion(txt) {
	const rubyMatch = regEx(/^ruby\s+(?<version>"[^"]+"|'[^']+')\s*$/gm).exec(txt);
	if (!rubyMatch?.groups) return null;
	const quotedVersion = rubyMatch.groups.version;
	return quotedVersion.substring(1, quotedVersion.length - 1);
}
async function getRubyConstraintFromFiles(packageFileName, newPackageFileContent) {
	const rubyMatch = extractRubyVersion(newPackageFileContent);
	if (rubyMatch) {
		logger.debug("Using ruby version from gemfile");
		return rubyMatch;
	}
	for (const file of [".ruby-version", ".tool-versions"]) {
		const rubyVersion = (await readLocalFile(getSiblingFileName(packageFileName, file), "utf8"))?.match(regEx(/^(?:ruby(?:-|\s+))?(?<version>\d[\d.]*)/m))?.groups?.version;
		if (rubyVersion) {
			logger.debug(`Using ruby version specified in ${file}`);
			return rubyVersion;
		}
	}
	const lockFile = await getLockFilePath(packageFileName);
	// v8 ignore else -- `getLockFilePath()` always returns a path
	if (lockFile) {
		const rubyVersion = (await readLocalFile(lockFile, "utf8"))?.match(regEx(/^ {3}ruby (?<version>\d[\d.]*)(?:[a-z]|\s|$)/m))?.groups?.version;
		if (rubyVersion) {
			logger.debug(`Using ruby version specified in lock file`);
			return rubyVersion;
		}
	}
	return null;
}
async function getRubyConstraint(updateArtifact) {
	const { packageFileName, config, newPackageFileContent } = updateArtifact;
	return await resolveToolConstraint(config, "ruby", () => getRubyConstraintFromFiles(packageFileName, newPackageFileContent));
}
function getBundlerConstraintFromLockFile(existingLockFileContent) {
	const bundledWith = regEx(/\nBUNDLED WITH\n\s+(?<version>.*?)(?:\n|$)/).exec(existingLockFileContent);
	if (bundledWith) {
		logger.debug("Using bundler version specified in lockfile");
		return bundledWith.groups.version;
	}
	return null;
}
async function getBundlerConstraint(updateArtifact, existingLockFileContent) {
	const { config } = updateArtifact;
	return await resolveToolConstraint(config, "bundler", () => getBundlerConstraintFromLockFile(existingLockFileContent));
}
async function getLockFilePath(packageFilePath) {
	const lockFilePath = await localPathExists(`${packageFilePath}.lock`) ? `${packageFilePath}.lock` : `Gemfile.lock`;
	logger.debug(`Lockfile for ${packageFilePath} found in ${lockFilePath}`);
	return lockFilePath;
}
//#endregion
export { delimiters, extractRubyVersion, getBundlerConstraint, getLockFilePath, getRubyConstraint };

//# sourceMappingURL=common.js.map