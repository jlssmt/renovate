import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceString } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, localPathExists } from "../../../util/fs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { PodDatasource } from "../../datasource/pod/index.js";
//#region lib/modules/manager/cocoapods/extract.ts
const regexMappings = [
	regEx(`^\\s*pod\\s+(['"])(?<spec>[^'"/]+)(/(?<subspec>[^'"]+))?(['"])`),
	regEx(`^\\s*pod\\s+(['"])[^'"]+(['"])\\s*,\\s*(['"])(?<currentValue>[^'"]+)(['"])\\s*$`),
	regEx(`,\\s*:git\\s*=>\\s*(['"])(?<git>[^'"]+)(['"])`),
	regEx(`,\\s*:tag\\s*=>\\s*(['"])(?<tag>[^'"]+)(['"])`),
	regEx(`,\\s*:path\\s*=>\\s*(['"])(?<path>[^'"]+)(['"])`),
	regEx(`^\\s*source\\s*(['"])(?<source>[^'"]+)(['"])`)
];
function parseLine(line) {
	let result = {};
	if (!line) return result;
	for (const regex of Object.values(regexMappings)) {
		const match = regex.exec(line.replace(regEx(/#.*$/), ""));
		if (match?.groups) result = {
			...result,
			...match.groups
		};
	}
	if (result.spec) {
		const depName = result.subspec ? `${result.spec}/${result.subspec}` : result.spec;
		const specName = result.spec;
		// v8 ignore else -- both derive from `result.spec`, already truthy above
		if (depName) result.depName = depName;
		// v8 ignore else -- see above
		if (specName) result.specName = specName;
		delete result.spec;
		delete result.subspec;
	}
	return result;
}
function gitDep(parsedLine) {
	const { depName, git, tag } = parsedLine;
	const platformMatch = regEx(/[@/](?<platform>github|gitlab)\.com[:/](?<account>[^/]+)\/(?<repo>[^/]+)/).exec(coerceString(git));
	if (platformMatch?.groups) {
		const { account, repo, platform } = platformMatch.groups;
		// v8 ignore else -- the regex only matches when both groups are present
		if (account && repo) return {
			datasource: platform === "github" ? GithubTagsDatasource.id : GitlabTagsDatasource.id,
			depName,
			packageName: `${account}/${repo.replace(regEx(/\.git$/), "")}`,
			currentValue: tag
		};
	}
	return {
		datasource: GitTagsDatasource.id,
		depName,
		packageName: git,
		currentValue: tag
	};
}
async function extractPackageFile(content, packageFile) {
	logger.trace(`cocoapods.extractPackageFile(${packageFile})`);
	const deps = [];
	const lines = content.split(newlineRegex);
	const registryUrls = [];
	for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
		const line = lines[lineNumber];
		const parsedLine = parseLine(line);
		const { depName, specName, currentValue, git, tag, path, source } = parsedLine;
		if (source) registryUrls.push(source.replace(regEx(/\/*$/), ""));
		if (depName) {
			const managerData = { lineNumber };
			let dep = {
				depName,
				sharedVariableName: specName,
				skipReason: "unspecified-version"
			};
			if (currentValue) dep = {
				depName,
				sharedVariableName: specName,
				datasource: PodDatasource.id,
				currentValue,
				managerData,
				registryUrls
			};
			else if (git) {
				if (tag) dep = {
					...gitDep(parsedLine),
					managerData
				};
				else dep = {
					depName,
					sharedVariableName: specName,
					skipReason: "git-dependency"
				};
			} else if (path) dep = {
				depName,
				sharedVariableName: specName,
				skipReason: "path-dependency"
			};
			deps.push(dep);
		}
	}
	const res = { deps };
	const lockFile = getSiblingFileName(packageFile, "Podfile.lock");
	// istanbul ignore if
	if (await localPathExists(lockFile)) res.lockFiles = [lockFile];
	return res;
}
//#endregion
export { extractPackageFile, gitDep, parseLine };

//# sourceMappingURL=extract.js.map