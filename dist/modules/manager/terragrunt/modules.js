import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { detectPlatform } from "../../../util/common.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GiteaTagsDatasource } from "../../datasource/gitea-tags/index.js";
import { ForgejoTagsDatasource } from "../../datasource/forgejo-tags/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { TerraformModuleDatasource } from "../../datasource/terraform-module/index.js";
import { extractTerragruntProvider } from "./providers.js";
//#region lib/modules/manager/terragrunt/modules.ts
const githubRefMatchRegex = regEx(/github\.com(?:[/:])(?<project>[^/]+\/[a-z0-9-_.]+).*\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/i);
const gitTagsRefMatchRegex = regEx(/(?:git::)?(?<url>(?:http|https|ssh):\/\/(?:.*@)?(?<host>[^/]*)\/(?<path>.*))\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/);
const tfrVersionMatchRegex = regEx(/tfr:\/\/(?<registry>.*?)\/(?<org>[^/]+?)\/(?<name>[^/]+?)\/(?<cloud>[^/?]+).*\?(?:ref|version)=(?<currentValue>.*?)$/);
const hostnameMatchRegex = regEx(/^(?<hostname>[a-zA-Z\d](?:[a-zA-Z\d-]*\.)+[a-zA-Z\d]+)/);
function extractTerragruntModule(startingLine, lines) {
	const result = extractTerragruntProvider(startingLine, lines, "terragrunt");
	result.dependencies.forEach((dep) => {
		dep.managerData.terragruntDependencyType = "terraform";
	});
	return result;
}
function detectGitTagDatasource(registryUrl) {
	switch (detectPlatform(registryUrl)) {
		case "gitlab": return GitlabTagsDatasource.id;
		case "bitbucket": return BitbucketTagsDatasource.id;
		case "gitea": return GiteaTagsDatasource.id;
		case "forgejo": return ForgejoTagsDatasource.id;
		default: return GitTagsDatasource.id;
	}
}
function analyseTerragruntModule(dep) {
	const source = dep.managerData.source;
	const githubRefMatch = githubRefMatchRegex.exec(source ?? "");
	const gitTagsRefMatch = gitTagsRefMatchRegex.exec(source ?? "");
	const tfrVersionMatch = tfrVersionMatchRegex.exec(source ?? "");
	if (githubRefMatch?.groups) {
		dep.depType = "github";
		dep.packageName = githubRefMatch.groups.project.replace(regEx(/\.git$/), "");
		dep.depName = `github.com/${dep.packageName}`;
		dep.currentValue = githubRefMatch.groups.tag;
		dep.datasource = GithubTagsDatasource.id;
	} else if (gitTagsRefMatch?.groups) {
		const { url, tag } = gitTagsRefMatch.groups;
		const parsedUrl = parseUrl(url);
		if (!parsedUrl) {
			logger.debug({ url }, "Terragrunt module has invalid URL, skipping");
			dep.skipReason = "invalid-url";
			return;
		}
		const { hostname, host, pathname, protocol } = parsedUrl;
		const containsSubDirectory = pathname.includes("//");
		if (containsSubDirectory) logger.debug("Terragrunt module contains subdirectory");
		dep.depType = "gitTags";
		const repositoryPath = pathname.replace(regEx(/^\//), "").split("//")[0].replace(regEx(".git$"), "");
		dep.depName = `${hostname}/${repositoryPath}`;
		dep.currentValue = tag;
		dep.datasource = detectGitTagDatasource(url);
		if (dep.datasource === GitTagsDatasource.id) {
			if (containsSubDirectory) {
				const tempLookupName = url.split("//");
				dep.packageName = `${tempLookupName[0]}//${tempLookupName[1]}`;
			} else dep.packageName = url;
		} else {
			dep.packageName = repositoryPath;
			dep.registryUrls = [protocol === "https:" ? `https://${host}` : `https://${hostname}`];
		}
	} else if (tfrVersionMatch?.groups) {
		dep.depType = "terragrunt";
		dep.depName = `${tfrVersionMatch.groups.org}/${tfrVersionMatch.groups.name}/${tfrVersionMatch.groups.cloud}`;
		dep.currentValue = tfrVersionMatch.groups.currentValue;
		dep.datasource = TerraformModuleDatasource.id;
		if (tfrVersionMatch.groups.registry) dep.registryUrls = [`https://${tfrVersionMatch.groups.registry}`];
	} else if (source) {
		const moduleParts = source.split("//")[0].split("/");
		if (moduleParts[0] === "..") dep.skipReason = "local";
		else if (moduleParts.length >= 3) {
			const hostnameMatch = hostnameMatchRegex.exec(source);
			if (hostnameMatch?.groups) dep.registryUrls = [`https://${hostnameMatch.groups.hostname}`];
			dep.depType = "terragrunt";
			dep.depName = moduleParts.join("/");
			dep.datasource = TerraformModuleDatasource.id;
		}
	} else {
		logger.debug({ dep }, "terragrunt dep has no source");
		dep.skipReason = "no-source";
	}
}
//#endregion
export { analyseTerragruntModule, extractTerragruntModule, gitTagsRefMatchRegex, githubRefMatchRegex, tfrVersionMatchRegex };

//# sourceMappingURL=modules.js.map