import { newlineRegex, regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { PLATFORM_FAMILIES } from "../../../constants/platforms.js";
import { find } from "../../../util/host-rules.js";
import { detectPlatform } from "../../../util/common.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { extractDependency as extractDependency$1 } from "../npm/extract/common/dependency.js";
import { parseLine } from "../gomod/line-parser.js";
import { pep508ToPackageDependency } from "../pep621/utils.js";
import { matchesPrecommitConfigHeuristic, matchesPrecommitDependencyHeuristic } from "./parsing.js";
import { isEmptyObject, isNonEmptyObject, isPlainObject } from "@sindresorhus/is";
//#region lib/modules/manager/pre-commit/extract.ts
/** The platform families pre-commit can resolve `rev:` tags on. */
const supportedFamilies = [
	"forgejo",
	"github",
	"gitlab"
];
/**
* Determines the datasource(id) to be used for this dependency
* @param repository the full git url, ie git@github.com/user/project.
*        Used in debug statements to clearly indicate the related dependency.
* @param hostname the hostname (ie github.com)
*        Used to determine which renovate datasource should be used.
*        Is matched literally against `github.com` and `gitlab.com`.
*        If that doesn't match, `hostRules.find()` is used to find related sources.
*        In that case, the hostname is passed on as registryUrl to the corresponding datasource.
*/
function determineDatasource(repository, hostname) {
	const platform = detectPlatform(repository);
	if (platform === "forgejo") {
		logger.debug({
			repository,
			hostname
		}, "Found forgejo dependency with custom registryUrl");
		return {
			datasource: PLATFORM_FAMILIES.forgejo.tagsDatasource,
			registryUrls: [`https://${hostname}`]
		};
	}
	if (hostname === "github.com" || platform === "github") {
		logger.debug({
			repository,
			hostname
		}, "Found github dependency");
		return { datasource: PLATFORM_FAMILIES.github.tagsDatasource };
	}
	if (hostname === "gitlab.com") {
		logger.debug({
			repository,
			hostname
		}, "Found gitlab dependency");
		return { datasource: PLATFORM_FAMILIES.gitlab.tagsDatasource };
	}
	if (platform === "gitlab") {
		logger.debug({
			repository,
			hostname
		}, "Found gitlab dependency with custom registryUrl");
		return {
			datasource: PLATFORM_FAMILIES.gitlab.tagsDatasource,
			registryUrls: [`https://${hostname}`]
		};
	}
	const hostUrl = `https://${hostname}`;
	const res = find({ url: hostUrl });
	if (isEmptyObject(res)) {
		logger.debug({
			repository,
			hostUrl
		}, "Provided hostname does not match any hostRules. Ignoring");
		return {
			skipReason: "unknown-registry",
			registryUrls: [hostname]
		};
	}
	for (const hostType of supportedFamilies) if (isNonEmptyObject(find({
		hostType,
		url: hostUrl
	}))) {
		logger.debug({
			repository,
			hostUrl,
			hostType
		}, `Provided hostname matches a ${hostType} hostrule.`);
		return {
			datasource: PLATFORM_FAMILIES[hostType].tagsDatasource,
			registryUrls: [hostname]
		};
	}
	logger.debug({
		repository,
		registry: hostUrl
	}, "Provided hostname did not match any of the hostRules of hostType forgejo, github nor gitlab");
	return {
		skipReason: "unknown-registry",
		registryUrls: [hostname]
	};
}
const gitUrlRegex = regEx(/\.git$/i);
const revLineWithFrozenCommentRegex = regEx(/^\s*rev:\s*(?<replaceString>(?<currentDigest>[a-f0-9]{40})(?<commentWhiteSpaces>\s+)#\s*frozen:\s*(?<currentValue>\S+))/);
function extractWithRegex(content) {
	logger.trace("pre-commit.extractWithRegex()");
	const regexDeps = /* @__PURE__ */ new Map();
	for (const line of content.split(newlineRegex)) {
		if (line.trim().startsWith("#")) continue;
		const match = revLineWithFrozenCommentRegex.exec(line);
		if (match?.groups) {
			const { currentDigest, currentValue, replaceString, commentWhiteSpaces } = match.groups;
			regexDeps.set(currentDigest, {
				currentDigest,
				currentValue,
				replaceString,
				autoReplaceStringTemplate: `{{newDigest}}${commentWhiteSpaces}# frozen: {{newValue}}`
			});
		}
	}
	return regexDeps;
}
function extractDependency(tag, repository) {
	logger.debug(`Found version ${tag}`);
	const urlMatchers = [
		regEx("^https?://(?<hostname>[^/]+)/(?<depName>\\S*)"),
		regEx("^git@(?<hostname>[^:]+):(?<depName>\\S*)"),
		regEx(/^git:\/\/(?<hostname>[^/]+)\/(?<depName>\S*)/),
		regEx(/^ssh:\/\/git@(?<hostname>[^/]+)\/(?<depName>\S*)/)
	];
	for (const urlMatcher of urlMatchers) {
		const match = urlMatcher.exec(repository);
		if (match?.groups) {
			const hostname = match.groups.hostname;
			const depName = match.groups.depName.replace(gitUrlRegex, "");
			return {
				...determineDatasource(repository, hostname),
				depName,
				depType: "repository",
				packageName: depName,
				currentValue: tag
			};
		}
	}
	logger.info({ repository }, "Could not separate hostname from full dependency url.");
	return {
		depName: void 0,
		depType: "repository",
		datasource: void 0,
		packageName: void 0,
		skipReason: "invalid-url",
		currentValue: tag
	};
}
/**
* Find all supported dependencies in the pre-commit yaml object.
*
* @param precommitFile the parsed yaml config file
* @param regexDeps Map of regex-extracted deps keyed by digest for enrichment
*/
function findDependencies(precommitFile, regexDeps) {
	if (!precommitFile.repos) {
		logger.debug(`No repos section found, skipping file`);
		return [];
	}
	const packageDependencies = [];
	for (const item of precommitFile.repos) {
		if (item.repo !== "meta") {
			for (const hook of coerceArray(item.hooks)) if (hook.language === "node") hook.additional_dependencies?.map((req) => {
				const match = regEx("^(?<name>.+)@(?<range>.+)$").exec(req);
				if (!match?.groups) return;
				const depType = "pre-commit-node";
				const dep = extractDependency$1(depType, match.groups.name, match.groups.range);
				packageDependencies.push({
					depType,
					depName: match.groups.name,
					packageName: match.groups.name,
					...dep
				});
			});
			else if (hook.language === "python") hook.additional_dependencies?.map((req) => {
				const dep = pep508ToPackageDependency("pre-commit-python", req);
				if (dep) packageDependencies.push(dep);
			});
			else if (hook.language === "golang") hook.additional_dependencies?.map((req) => {
				const requireLine = `require ${req.replace("@", " ")}`;
				const dep = parseLine(requireLine);
				if (dep) {
					const depType = "pre-commit-golang";
					packageDependencies.push({
						...dep,
						depType
					});
				}
			});
		}
		if (matchesPrecommitDependencyHeuristic(item)) {
			logger.trace(item, "Matched pre-commit dependency spec");
			const repository = String(item.repo);
			const tag = String(item.rev);
			const dep = extractDependency(tag, repository);
			const regexDep = regexDeps.get(tag);
			if (regexDep) {
				dep.currentDigest = regexDep.currentDigest;
				dep.currentValue = regexDep.currentValue;
				dep.replaceString = regexDep.replaceString;
				dep.autoReplaceStringTemplate = regexDep.autoReplaceStringTemplate;
			}
			packageDependencies.push(dep);
		} else logger.trace(item, "Did not find pre-commit repo spec");
	}
	return packageDependencies;
}
function extractPackageFile(content, packageFile) {
	let parsedContent;
	try {
		parsedContent = parseSingleYaml(content);
	} catch (err) {
		logger.debug({
			filename: packageFile,
			err
		}, "Failed to parse pre-commit config YAML");
		return null;
	}
	if (!isPlainObject(parsedContent)) {
		logger.debug({ packageFile }, `Parsing of pre-commit config YAML returned invalid result`);
		return null;
	}
	if (!matchesPrecommitConfigHeuristic(parsedContent)) {
		logger.debug({ packageFile }, `File does not look like a pre-commit config file`);
		return null;
	}
	try {
		const regexDeps = extractWithRegex(content);
		const deps = findDependencies(parsedContent, regexDeps);
		if (deps.length) {
			logger.trace({ deps }, "Found dependencies in pre-commit config");
			return { deps };
		}
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			packageFile,
			err
		}, "Error scanning parsed pre-commit config");
	}
	return null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map