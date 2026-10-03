import { get, set } from "../../../util/cache/memory/index.js";
import { newlineRegex, regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { logger, withMeta } from "../../../logger/index.js";
import { PLATFORM_FAMILIES } from "../../../constants/platforms.js";
import { parseUrl } from "../../../util/url.js";
import { detectPlatform } from "../../../util/common.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { api } from "../../versioning/docker/index.js";
import { id } from "../../versioning/exact/index.js";
import { id as id$1 } from "../../versioning/github-actions/index.js";
import { GithubDigestDatasource } from "../../datasource/github-digest/index.js";
import { GithubRunnersDatasource } from "../../datasource/github-runners/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { getDep } from "../dockerfile/extract.js";
import { actionsLockFile, isLockfileManaged } from "./common.js";
import { isSha, isShortSha, parseUsesLine, versionLikeRe } from "./parse.js";
import { ActionsLockfile, CommunityActions, Workflow } from "./schema.js";
import is from "@sindresorhus/is";
//#region lib/modules/manager/github-actions/extract.ts
function detectCustomGitHubRegistryUrlsForActions() {
	const endpoint = GlobalConfig.get("endpoint");
	const registryUrls = ["https://github.com"];
	if (endpoint && GlobalConfig.get("platform") === "github") {
		const parsedEndpoint = parseUrl(endpoint);
		if (!parsedEndpoint) {
			logger.warn({ endpoint }, "Failed to parse endpoint url");
			return {};
		}
		if (parsedEndpoint.host !== "github.com" && parsedEndpoint.host !== "api.github.com") {
			registryUrls.unshift(`${parsedEndpoint.protocol}//${parsedEndpoint.host}`);
			return { registryUrls };
		}
	}
	return {};
}
function extractDockerAction(actionRef, config) {
	const dep = getDep(actionRef.originalRef, true, config.registryAliases);
	dep.depType = "docker";
	dep.replaceString = actionRef.originalRef;
	return dep;
}
const reusableWorkflowPathRe = regEx(/^\.github\/workflows\/[^/]+\.ya?ml$/);
function extractRepositoryAction(actionRef, parsed, customRegistryUrlsPackageDependency) {
	const { replaceString: valueString, quote, commentData, commentPrecedingWhitespace } = parsed;
	const { owner, repo, path: subPath, ref, hostname, isExplicitHostname } = actionRef;
	const registryUrl = isExplicitHostname ? `https://${hostname}/` : "";
	const packageName = `${owner}/${repo}`;
	const depName = `${registryUrl}${packageName}`;
	const pathSuffix = subPath ? `/${subPath}` : "";
	const commentWs = commentPrecedingWhitespace || " ";
	const isReusableWorkflow = !!subPath && reusableWorkflowPathRe.test(subPath);
	const dep = {
		depName,
		commitMessageTopic: "{{{depName}}} action",
		versioning: id$1,
		depType: isReusableWorkflow ? "workflow" : "action",
		replaceString: valueString,
		autoReplaceStringTemplate: `${quote}{{depName}}${pathSuffix}@{{#if newDigest}}{{newDigest}}${quote}{{#if newValue}}${commentWs}# {{newValue}}{{/if}}{{/if}}{{#unless newDigest}}{{newValue}}${quote}{{/unless}}`,
		...isExplicitHostname ? detectDatasource(registryUrl) : customRegistryUrlsPackageDependency
	};
	if (packageName !== depName) dep.packageName = packageName;
	if ((commentData.pinnedVersion ?? (isSha(ref) || isShortSha(ref) ? commentData.ref : void 0)) && !is.undefined(commentData.index) && !is.undefined(commentData.matchedString)) {
		const cleanComment = parsed.commentString.slice(1);
		const matchEndIndex = commentData.index + commentData.matchedString.length;
		dep.replaceString = `${valueString}${commentPrecedingWhitespace}#${cleanComment.slice(0, matchEndIndex)}`;
	} else if (commentData.ratchetExclude) dep.replaceString = valueString + commentPrecedingWhitespace + parsed.commentString;
	if (isSha(ref)) {
		dep.currentValue = commentData.pinnedVersion ?? commentData.ref;
		dep.currentDigest = ref;
	} else if (isShortSha(ref)) {
		dep.currentValue = commentData.pinnedVersion ?? commentData.ref;
		dep.currentDigestShort = ref;
	} else dep.currentValue = ref;
	if (!dep.currentValue) {
		dep.enabled = false;
		dep.skipReason = "unversioned-reference";
	}
	const isVersionLike = dep.currentValue && versionLikeRe.test(dep.currentValue);
	if (!dep.datasource && dep.currentValue && !isVersionLike) {
		dep.datasource = GithubDigestDatasource.id;
		dep.versioning = id;
	}
	dep.datasource ??= GithubTagsDatasource.id;
	return dep;
}
function extractWithRegex(content, config) {
	const customRegistryUrlsPackageDependency = detectCustomGitHubRegistryUrlsForActions();
	logger.trace("github-actions.extractWithRegex()");
	const deps = [];
	for (const line of content.split(newlineRegex)) {
		if (line.trim().startsWith("#")) continue;
		const parsed = parseUsesLine(line);
		if (!parsed?.actionRef) continue;
		const { actionRef } = parsed;
		if (actionRef.kind === "docker") {
			deps.push(extractDockerAction(actionRef, config));
			continue;
		}
		// v8 ignore else -- the parsed ref is either a docker or a repository ref
		if (actionRef.kind === "repository") deps.push(extractRepositoryAction(actionRef, parsed, customRegistryUrlsPackageDependency));
	}
	return deps;
}
function detectDatasource(registryUrl) {
	const platform = detectPlatform(registryUrl);
	switch (platform) {
		case "forgejo":
		case "gitea": return {
			registryUrls: [registryUrl],
			datasource: PLATFORM_FAMILIES[platform].tagsDatasource
		};
		case "github": return { registryUrls: [registryUrl] };
	}
	return { skipReason: "unsupported-url" };
}
const runnerVersionRegex = regEx(/^\s*(?<depName>[a-zA-Z]+)-(?<currentValue>[^\s]+)/);
function extractRunner(runner) {
	const runnerVersionGroups = runnerVersionRegex.exec(runner)?.groups;
	if (!runnerVersionGroups) return null;
	const { depName, currentValue } = runnerVersionGroups;
	if (!GithubRunnersDatasource.isValidRunner(depName, currentValue)) return null;
	const dependency = {
		depName,
		currentValue,
		replaceString: `${depName}-${currentValue}`,
		depType: "github-runner",
		datasource: GithubRunnersDatasource.id,
		autoReplaceStringTemplate: "{{depName}}-{{newValue}}"
	};
	if (!api.isValid(currentValue)) dependency.skipReason = "invalid-version";
	return dependency;
}
function extractSteps(steps) {
	const deps = [];
	for (const step of steps) {
		const res = CommunityActions.safeParse(step);
		if (res.success) deps.push(...res.data);
	}
	return deps;
}
function extractWithYAMLParser(content, packageFile, config) {
	logger.trace("github-actions.extractWithYAMLParser()");
	const obj = withMeta({ packageFile }, () => Workflow.parse(content));
	if (!obj) return [];
	if ("runs" in obj && obj.runs.steps) return extractSteps(obj.runs.steps);
	if (!("jobs" in obj)) return [];
	const deps = [];
	for (const job of Object.values(obj.jobs)) {
		if (job.container) {
			const dep = getDep(job.container, true, config.registryAliases);
			// v8 ignore else -- `getDep()` always returns a dep
			if (dep) {
				dep.depType = "container";
				deps.push(dep);
			}
		}
		for (const service of job.services) {
			const dep = getDep(service, true, config.registryAliases);
			// v8 ignore else -- `getDep()` always returns a dep
			if (dep) {
				dep.depType = "service";
				deps.push(dep);
			}
		}
		for (const runner of job["runs-on"]) {
			const dep = extractRunner(runner);
			if (dep) deps.push(dep);
		}
		deps.push(...extractSteps(job.steps));
	}
	return deps;
}
async function readLockfile() {
	const content = await readLocalFile(actionsLockFile, "utf8");
	if (!content) return { type: "missing" };
	const parsed = ActionsLockfile.safeParse(content);
	if (!parsed.success) {
		logger.debug(`Failed to parse ${actionsLockFile}`);
		return { type: "unparseable" };
	}
	return {
		type: "parsed",
		onboardedWorkflows: parsed.data.workflows
	};
}
/**
* A repository has a single lock file, but can have any number of package files, so read and parse it only once.
*/
function getLockfile() {
	const cacheKey = `github-actions:${actionsLockFile}`;
	const cached = get(cacheKey);
	if (cached !== void 0) return cached;
	const result = readLockfile();
	set(cacheKey, result);
	return result;
}
/**
* Whether `gh actions-lock` owns the digests in this file.
*
* It rewrites the workflows it manages back to plain refs when regenerating, so an inline digest pin would be stripped straight back out.
*/
async function isManagedByLockfile(packageFile) {
	const lockfile = await getLockfile();
	switch (lockfile.type) {
		case "missing": return false;
		case "unparseable": return true;
		case "parsed": return isLockfileManaged(packageFile, lockfile.onboardedWorkflows);
	}
}
async function extractPackageFile(content, packageFile, config = {}) {
	logger.trace(`github-actions.extractPackageFile(${packageFile})`);
	const deps = [...extractWithRegex(content, config), ...extractWithYAMLParser(content, packageFile, config)];
	if (!deps.length) return null;
	const res = { deps };
	if (await isManagedByLockfile(packageFile)) {
		for (const dep of deps) if (dep.depType === "action" || dep.depType === "workflow") dep.digestManagedExternally = true;
	}
	return res;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map