import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getHttpUrl } from "../../../util/git/url.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getOciChartDep, isOCIRegistry } from "../helmv3/oci.js";
import { Vendir } from "./schema.js";
//#region lib/modules/manager/vendir/extract.ts
function extractHelmChart(helmChart, aliases) {
	if (isOCIRegistry(helmChart.repository.url)) return {
		...getOciChartDep(helmChart.repository.url, helmChart.name, aliases),
		depName: helmChart.name,
		depType: "HelmChart",
		currentValue: helmChart.version
	};
	return {
		depName: helmChart.name,
		currentValue: helmChart.version,
		depType: "HelmChart",
		registryUrls: [helmChart.repository.url],
		datasource: HelmDatasource.id
	};
}
function extractGitSource(gitSource) {
	return {
		depName: getHttpUrl(gitSource.url),
		depType: "GitSource",
		currentValue: gitSource.ref,
		datasource: GitRefsDatasource.id
	};
}
function extractGithubReleaseSource(githubRelease) {
	return {
		depName: githubRelease.slug,
		packageName: githubRelease.slug,
		depType: "GithubRelease",
		currentValue: githubRelease.tag,
		datasource: GithubReleasesDatasource.id
	};
}
function extractHttpReleaseSource(httpRelease) {
	return {
		packageName: httpRelease.url,
		currentValue: "latest",
		depType: "HttpSource",
		skipReason: "unsupported-datasource"
	};
}
function parseVendir(content, packageFile) {
	try {
		return parseSingleYaml(content, {
			customSchema: Vendir,
			removeTemplates: true
		});
	} catch {
		logger.debug({ packageFile }, "Error parsing vendir.yml file");
		return null;
	}
}
function extractPackageFile(content, packageFile, config) {
	logger.trace(`vendir.extractPackageFile(${packageFile})`);
	const deps = [];
	const pkg = parseVendir(content, packageFile);
	if (!pkg) return null;
	const contents = pkg.directories.flatMap((directory) => directory.contents);
	for (const content of contents)
 // v8 ignore else -- hard to test
	if ("helmChart" in content && content.helmChart) {
		const dep = extractHelmChart(content.helmChart, config.registryAliases);
		deps.push(dep);
	} else if ("git" in content && content.git) {
		const dep = extractGitSource(content.git);
		deps.push(dep);
	} else if ("githubRelease" in content && content.githubRelease) {
		const dep = extractGithubReleaseSource(content.githubRelease);
		deps.push(dep);
	} else if ("http" in content && content.http) {
		const dep = extractHttpReleaseSource(content.http);
		deps.push(dep);
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractGitSource, extractGithubReleaseSource, extractHelmChart, extractHttpReleaseSource, extractPackageFile, parseVendir };

//# sourceMappingURL=extract.js.map