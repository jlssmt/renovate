import { regEx } from "../../../util/regex.js";
import { GlobalConfig } from "../../../config/global.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { AzurePipelinesTasksDatasource } from "../../datasource/azure-pipelines-tasks/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { getDep } from "../dockerfile/extract.js";
import { AzurePipelinesYaml } from "./schema.js";
//#region lib/modules/manager/azure-pipelines/extract.ts
const AzurePipelinesTaskRegex = regEx(/^(?<name>[^@]+)@(?<version>.*)$/);
function extractRepository(repository, currentRepository) {
	let repositoryUrl = null;
	let depName = repository.name;
	if (repository.type === "github") repositoryUrl = `https://github.com/${repository.name}.git`;
	else if (repository.type === "git") {
		const platform = GlobalConfig.get("platform");
		const endpoint = GlobalConfig.get("endpoint");
		if (platform === "azure" && endpoint) {
			if (repository.name.includes("/")) {
				const [projectName, repoName] = repository.name.split("/");
				repositoryUrl = joinUrlParts(endpoint, encodeURIComponent(projectName), "_git", encodeURIComponent(repoName));
			} else if (currentRepository?.includes("/")) {
				const projectName = currentRepository.split("/")[0];
				depName = `${projectName}/${repository.name}`;
				repositoryUrl = joinUrlParts(endpoint, encodeURIComponent(projectName), "_git", encodeURIComponent(repository.name));
			} else logger.debug("Renovate cannot update Azure pipelines in git repositories when neither the current repository nor the target repository contains the Azure DevOps project name.");
		}
	}
	if (repositoryUrl === null) return null;
	if (!repository.ref?.startsWith("refs/tags/")) return null;
	return {
		autoReplaceStringTemplate: "refs/tags/{{newValue}}",
		currentValue: repository.ref.replace("refs/tags/", ""),
		datasource: GitTagsDatasource.id,
		depName,
		depType: "gitTags",
		packageName: repositoryUrl,
		replaceString: repository.ref
	};
}
function extractContainer(container) {
	const dep = getDep(container.image);
	logger.debug({
		depName: dep.depName,
		currentValue: dep.currentValue,
		currentDigest: dep.currentDigest
	}, "Azure pipelines docker image");
	dep.depType = "docker";
	return dep;
}
function extractAzurePipelinesTasks(task) {
	const match = AzurePipelinesTaskRegex.exec(task);
	if (match?.groups) return {
		depName: match.groups.name,
		currentValue: match.groups.version,
		datasource: AzurePipelinesTasksDatasource.id
	};
	return null;
}
function parseAzurePipelines(content, packageFile) {
	const res = AzurePipelinesYaml.safeParse(content);
	if (res.success) return res.data;
	logger.debug({
		err: res.error,
		packageFile
	}, "Error parsing pubspec lockfile.");
	return null;
}
function extractSteps(steps) {
	const deps = [];
	for (const step of coerceArray(steps)) {
		const task = extractAzurePipelinesTasks(step.task);
		if (task) deps.push(task);
	}
	return deps;
}
function extractJob(job) {
	return extractSteps(job?.steps);
}
function extractDeploy(deploy) {
	const deps = extractJob(deploy?.deploy);
	deps.push(...extractJob(deploy?.postRouteTraffic));
	deps.push(...extractJob(deploy?.preDeploy));
	deps.push(...extractJob(deploy?.routeTraffic));
	deps.push(...extractJob(deploy?.on?.failure));
	deps.push(...extractJob(deploy?.on?.success));
	return deps;
}
function extractJobs(jobs) {
	const deps = [];
	for (const jobOrDeployment of coerceArray(jobs)) {
		const deployment = jobOrDeployment;
		if (deployment.strategy) {
			deps.push(...extractDeploy(deployment.strategy.canary));
			deps.push(...extractDeploy(deployment.strategy.rolling));
			deps.push(...extractDeploy(deployment.strategy.runOnce));
			continue;
		}
		const job = jobOrDeployment;
		deps.push(...extractJob(job));
	}
	return deps;
}
function extractPackageFile(content, packageFile, config) {
	logger.trace(`azurePipelines.extractPackageFile(${packageFile})`);
	const deps = [];
	const pkg = parseAzurePipelines(content, packageFile);
	if (!pkg) return null;
	for (const repository of coerceArray(pkg.resources?.repositories)) {
		const dep = extractRepository(repository, config.repository);
		if (dep) deps.push(dep);
	}
	for (const container of coerceArray(pkg.resources?.containers)) {
		const dep = extractContainer(container);
		// v8 ignore else -- `extractContainer()` always returns a dep
		if (dep) deps.push(dep);
	}
	for (const { jobs } of coerceArray(pkg.stages)) deps.push(...extractJobs(jobs));
	deps.push(...extractJobs(pkg.jobs));
	deps.push(...extractSteps(pkg.steps));
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractAzurePipelinesTasks, extractContainer, extractPackageFile, extractRepository, parseAzurePipelines };

//# sourceMappingURL=extract.js.map