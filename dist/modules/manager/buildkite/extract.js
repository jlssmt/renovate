import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isValid as isVersion } from "../../versioning/semver/index.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
//#region lib/modules/manager/buildkite/extract.ts
function extractPackageFile(content, packageFile) {
	const deps = [];
	try {
		const lines = content.split(newlineRegex);
		for (const line of lines) {
			const depLineMatch = regEx(/^\s*(?:-\s+(?:\?\s+)?)?['"]?(?<depName>[^#\s'"]+)#(?<currentValue>[^:'"]+)['"]?/).exec(line);
			if (depLineMatch?.groups) {
				const { depName, currentValue } = depLineMatch.groups;
				logger.trace("depLineMatch");
				let skipReason;
				let repo;
				logger.trace(`Found Buildkite plugin ${depName}`);
				const gitPluginMatch = regEx(/(?:ssh:\/\/git@|https:\/\/)(?<registry>[^/]+)\/(?<gitPluginName>.*)/).exec(depName);
				if (gitPluginMatch?.groups) {
					logger.debug("Examining git plugin");
					const { registry, gitPluginName } = gitPluginMatch.groups;
					const gitDepName = gitPluginName.replace(regEx("\\.git$"), "");
					let datasource = GithubTagsDatasource.id;
					if (registry === "bitbucket.org") datasource = BitbucketTagsDatasource.id;
					const dep = {
						depName: gitDepName,
						currentValue,
						registryUrls: [`https://${registry}`],
						datasource
					};
					deps.push(dep);
					continue;
				} else if (isVersion(currentValue)) {
					const splitName = depName.split("/");
					if (splitName.length === 1) repo = `buildkite-plugins/${depName}-buildkite-plugin`;
					else if (splitName.length === 2) repo = `${depName}-buildkite-plugin`;
					else {
						logger.warn({ dependency: depName }, "Something is wrong with Buildkite plugin name");
						skipReason = "invalid-dependency-specification";
					}
				} else {
					logger.debug(`Skipping non-pinned Buildkite current version ${currentValue}`);
					skipReason = "invalid-version";
				}
				const dep = {
					depName,
					currentValue,
					skipReason
				};
				if (repo) {
					dep.datasource = GithubTagsDatasource.id;
					dep.packageName = repo;
				}
				deps.push(dep);
			}
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error extracting Buildkite plugins");
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map