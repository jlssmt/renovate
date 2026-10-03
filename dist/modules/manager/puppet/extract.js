import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { PuppetForgeDatasource } from "../../datasource/puppet-forge/index.js";
import { isGithubUrl, parseGitOwnerRepo } from "./common.js";
import { parsePuppetfile } from "./puppetfile-parser.js";
//#region lib/modules/manager/puppet/extract.ts
function parseForgeDependency(module, forgeUrl) {
	const dep = {
		depName: module.name,
		datasource: PuppetForgeDatasource.id,
		packageName: module.name,
		currentValue: module.version
	};
	if (forgeUrl) dep.registryUrls = [forgeUrl];
	return dep;
}
function parseGitDependency(module) {
	const moduleName = module.name;
	const git = module.tags?.get("git");
	const tag = module.tags?.get("tag");
	if (!git || !tag) return {
		depName: moduleName,
		sourceUrl: git,
		skipReason: "invalid-version"
	};
	const parsedUrl = parseUrl(git);
	const githubUrl = isGithubUrl(git, parsedUrl);
	if (githubUrl && parsedUrl && parsedUrl.protocol !== "https:") {
		logger.debug(`Access to github is only allowed for https, your url was: ${git}`);
		return {
			depName: moduleName,
			sourceUrl: git,
			skipReason: "invalid-url"
		};
	}
	const gitOwnerRepo = parseGitOwnerRepo(git, githubUrl);
	if (!gitOwnerRepo) return {
		depName: moduleName,
		sourceUrl: git,
		skipReason: "invalid-url"
	};
	const packageDependency = {
		depName: moduleName,
		packageName: git,
		sourceUrl: git,
		gitRef: true,
		currentValue: tag,
		datasource: GitTagsDatasource.id
	};
	if (githubUrl) {
		packageDependency.packageName = gitOwnerRepo;
		packageDependency.datasource = GithubTagsDatasource.id;
	}
	return packageDependency;
}
function isGitModule(module) {
	return module.tags?.has("git") ?? false;
}
function extractPackageFile(content) {
	logger.trace("puppet.extractPackageFile()");
	const puppetFile = parsePuppetfile(content);
	const deps = [];
	for (const forgeUrl of puppetFile.getForges()) for (const module of puppetFile.getModulesOfForge(forgeUrl)) {
		let packageDependency;
		if (isGitModule(module)) packageDependency = parseGitDependency(module);
		else packageDependency = parseForgeDependency(module, forgeUrl);
		if (module.skipReason) packageDependency.skipReason = module.skipReason;
		deps.push(packageDependency);
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map