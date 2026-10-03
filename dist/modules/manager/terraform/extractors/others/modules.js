import { regEx } from "../../../../../util/regex.js";
import { logger } from "../../../../../logger/index.js";
import { BitbucketTagsDatasource } from "../../../../datasource/bitbucket-tags/index.js";
import { GitTagsDatasource } from "../../../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../../../datasource/github-tags/index.js";
import { TerraformModuleDatasource } from "../../../../datasource/terraform-module/index.js";
import { isOCIRegistry } from "../../../helmv3/oci.js";
import { applyOciDependency } from "../../util.js";
import { DependencyExtractor } from "../../base.js";
import { isNullOrUndefined, isPlainObject } from "@sindresorhus/is";
//#region lib/modules/manager/terraform/extractors/others/modules.ts
const githubRefMatchRegex = regEx(/github\.com(?:[/:])(?<project>[^/]+\/[a-z0-9-_.]+).*\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/i);
const bitbucketRefMatchRegex = regEx(/(?:git::)?(?<url>(?:http|https|ssh)?(?::\/\/)?(?:.*@)?(?<path>bitbucket\.org\/(?<workspace>.*)\/(?<project>.*)\.git\/?(?<subfolder>.*)))\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/);
const gitTagsRefMatchRegex = regEx(/(?:git::)?(?<url>(?:(?:http|https|ssh):\/\/)?(?:.*@)?(?<path>[^:/]+[:/](?<project>[^/]+(?:\/[^/]+)*))(?:\.git)?)(?:(?:\/\/)?(?<subfolder>[^?]*))?\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/);
const azureDevOpsSshRefMatchRegex = regEx(/(?:git::)?(?<url>git@ssh\.dev\.azure\.com:v3\/(?<organization>[^/]*)\/(?<project>[^/]*)\/(?<repository>[^/]*))(?<modulepath>.*)?\?(?:depth=\d+&)?ref=(?<tag>.*?)(?:&depth=\d+)?$/);
const hostnameMatchRegex = regEx(/^(?<hostname>[a-zA-Z\d](?:[a-zA-Z\d-]*\.)+[a-zA-Z\d]+)/);
var ModuleExtractor = class extends DependencyExtractor {
	getCheckList() {
		return ["module"];
	}
	extract(hclRoot, _locks, config) {
		const modules = hclRoot.module;
		if (isNullOrUndefined(modules)) return [];
		/* v8 ignore next -- needs test */
		if (!isPlainObject(modules)) {
			logger.debug({ modules }, "Terraform: unexpected `modules` value");
			return [];
		}
		const dependencies = [];
		for (const [depName, moduleElements] of Object.entries(modules)) for (const moduleElement of moduleElements) {
			const dep = {
				depName,
				depType: "module",
				currentValue: moduleElement.version,
				managerData: { source: moduleElement.source }
			};
			dependencies.push(this.analyseTerraformModule(dep, config));
		}
		return dependencies;
	}
	analyseTerraformModule(dep, config) {
		const source = dep.managerData.source;
		if (isOCIRegistry(source)) {
			applyOciDependency(dep, source, config.registryAliases);
			return dep;
		}
		const githubRefMatch = githubRefMatchRegex.exec(source);
		const bitbucketRefMatch = bitbucketRefMatchRegex.exec(source);
		const gitTagsRefMatch = gitTagsRefMatchRegex.exec(source);
		const azureDevOpsSshRefMatch = azureDevOpsSshRefMatchRegex.exec(source);
		if (githubRefMatch?.groups) {
			dep.packageName = githubRefMatch.groups.project.replace(regEx(/\.git$/), "");
			dep.depName = `github.com/${dep.packageName}`;
			dep.currentValue = githubRefMatch.groups.tag;
			dep.datasource = GithubTagsDatasource.id;
		} else if (bitbucketRefMatch?.groups) {
			dep.depName = `${bitbucketRefMatch.groups.workspace}/${bitbucketRefMatch.groups.project}`;
			dep.packageName = dep.depName;
			dep.currentValue = bitbucketRefMatch.groups.tag;
			dep.datasource = BitbucketTagsDatasource.id;
		} else if (azureDevOpsSshRefMatch?.groups) {
			dep.depName = `${azureDevOpsSshRefMatch.groups.organization}/${azureDevOpsSshRefMatch.groups.project}/${azureDevOpsSshRefMatch.groups.repository}${azureDevOpsSshRefMatch.groups.modulepath}`;
			dep.packageName = azureDevOpsSshRefMatch.groups.url;
			dep.currentValue = azureDevOpsSshRefMatch.groups.tag;
			dep.datasource = GitTagsDatasource.id;
		} else if (gitTagsRefMatch?.groups) {
			if (gitTagsRefMatch.groups.subfolder) logger.debug("Terraform module contains subdirectory");
			dep.depName = gitTagsRefMatch.groups.path.replace(regEx(/\.git$/), "");
			dep.packageName = gitTagsRefMatch.groups.url.replace(regEx(/\.git$/), "");
			dep.currentValue = gitTagsRefMatch.groups.tag;
			dep.datasource = GitTagsDatasource.id;
		} else if (source) {
			const moduleParts = source.split("//")[0].split("/");
			if (moduleParts[0] === "." || moduleParts[0] === "..") dep.skipReason = "local";
			else if (moduleParts.length >= 3) {
				const hostnameMatch = hostnameMatchRegex.exec(source);
				if (hostnameMatch?.groups) dep.registryUrls = [`https://${hostnameMatch.groups.hostname}`];
				dep.depName = moduleParts.join("/");
				dep.datasource = TerraformModuleDatasource.id;
			}
		} else {
			logger.debug({ dep }, "terraform dep has no source");
			dep.skipReason = "no-source";
		}
		return dep;
	}
};
//#endregion
export { ModuleExtractor, azureDevOpsSshRefMatchRegex, bitbucketRefMatchRegex, gitTagsRefMatchRegex, githubRefMatchRegex, hostnameMatchRegex };

//# sourceMappingURL=modules.js.map