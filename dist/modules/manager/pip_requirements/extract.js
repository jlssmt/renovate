import { newlineRegex, regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { isSkipComment } from "../../../util/ignore.js";
import { extractPackageFileFlags } from "./common.js";
import { isTruthy } from "@sindresorhus/is";
import { RANGE_PATTERN } from "@renovatebot/pep440";
//#region lib/modules/manager/pip_requirements/extract.ts
const packagePattern = "[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]";
const extrasPattern = "(?:\\s*\\[[^\\]]+\\])?";
const packageGitRegex = regEx(/(?<source>(?:git\+)(?<protocol>git|ssh|https):\/\/(?<gitUrl>(?:(?<user>[^@]+)@)?(?<hostname>[\w.-]+)(?<delimiter>\/)(?<scmPath>.*\/(?<depName>[\w/-]+))(?:\.git)?(?:@(?<version>.*))))/);
const specifierPartPattern = `\\s*${RANGE_PATTERN.replace(regEx(/\?<\w+>/g), "?:")}`;
const dependencyPattern = `(${packagePattern})(${extrasPattern})(${`${specifierPartPattern}(?:\\s*,${specifierPartPattern})*`})?`;
function extractPackageFile(content) {
	logger.trace("pip_requirements.extractPackageFile()");
	const pkgRegex = regEx(`^(${packagePattern})$`);
	const pkgValRegex = regEx(`^${dependencyPattern}$`);
	const deps = content.split(newlineRegex).map((rawline) => {
		let dep = {};
		const [line, comment] = rawline.split("#").map((part) => part.trim());
		if (isSkipComment(comment)) dep.skipReason = "ignored";
		const [lineNoEnvMarkers] = line.split(";").map((part) => part.trim());
		const lineNoHashes = lineNoEnvMarkers.split(" \\")[0];
		const packageMatches = pkgValRegex.exec(lineNoHashes) ?? pkgRegex.exec(lineNoHashes);
		const gitPackageMatches = packageGitRegex.exec(lineNoHashes);
		if (!packageMatches && !gitPackageMatches) return null;
		if (gitPackageMatches?.groups) {
			const currentVersion = gitPackageMatches.groups.version;
			const depName = gitPackageMatches.groups.depName;
			let packageName;
			if (gitPackageMatches.groups.protocol === "https") packageName = "https://".concat(gitPackageMatches.groups.gitUrl).replace(`@${currentVersion}`, "");
			else {
				const scmPath = gitPackageMatches.groups.scmPath;
				const delimiter = gitPackageMatches.groups.delimiter;
				packageName = gitPackageMatches.groups.gitUrl.replace(`${delimiter}${scmPath}`, `:${scmPath}`).replace(`@${currentVersion}`, "");
			}
			dep = {
				...dep,
				depName,
				currentValue: currentVersion,
				currentVersion,
				packageName,
				datasource: GitTagsDatasource.id
			};
			return dep;
		}
		const [, depName, , currVal] = packageMatches;
		const currentValue = currVal?.trim();
		dep = {
			...dep,
			depName,
			packageName: normalizePythonDepName(depName),
			currentValue,
			datasource: PypiDatasource.id
		};
		if (currentValue?.startsWith("==")) dep.currentVersion = currentValue.replace(regEx(/^==\s*/), "");
		return dep;
	}).filter(isTruthy);
	const res = extractPackageFileFlags(content);
	res.deps = deps;
	if (!res.deps.length && !res.registryUrls?.length && !res.additionalRegistryUrls?.length && !res.managerData?.requirementsFiles?.length && !res.managerData?.constraintsFiles?.length) return null;
	return res;
}
//#endregion
export { dependencyPattern, extractPackageFile, extrasPattern, packagePattern };

//# sourceMappingURL=extract.js.map