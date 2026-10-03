import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getDep } from "../dockerfile/extract.js";
import { getOciChartDep, isOCIRegistry } from "../helmv3/oci.js";
import { isString } from "@sindresorhus/is";
import querystring from "node:querystring";
//#region lib/modules/manager/kustomize/extract.ts
const gitUrl = regEx(/^(?:git::)?(?<url>(?:(?:(?:http|https|ssh):\/\/)?(?:.*@)?)?(?<path>(?:[^:/\s]+(?::[0-9]+)?[:/])?(?<project>[^/\s]+\/[^/\s]+)))(?<subdir>[^?\s]*)\?(?<queryString>.+)$/);
const dotGitRegex = regEx(/^(?:git::)?(?<url>(?:(?:(?:http|https|ssh):\/\/)?(?:.*@)?)?(?<path>(?:[^:/\s]+(?::[0-9]+)?[:/])?(?<project>[^?\s]*(?:\.git))))(?<subdir>[^?\s]*)\?(?<queryString>.+)$/);
const underscoreGitRegex = regEx(/^(?:git::)?(?<url>(?:(?:(?:http|https|ssh):\/\/)?(?:.*@)?)?(?<path>(?:[^:/\s]+(?::[0-9]+)?[:/])?(?<project>[^?\s]*)(?:_git\/[^/\s]+)))(?<subdir>[^?\s]*)\?(?<queryString>.+)$/);
const gitUrlWithPath = regEx(/^(?:git::)?(?<url>(?:(?:(?:http|https|ssh):\/\/)?(?:.*@)?)?(?<path>(?:[^:/\s]+(?::[0-9]+)?[:/])(?<project>[^?\s]+)))(?:\/\/)(?<subdir>[^?\s]+)\?(?<queryString>.+)$/);
function extractResource(base) {
	let match;
	if (base.includes("_git")) match = underscoreGitRegex.exec(base);
	else if (base.includes(".git")) match = dotGitRegex.exec(base);
	else if (gitUrlWithPath.test(base)) match = gitUrlWithPath.exec(base);
	else match = gitUrl.exec(base);
	if (!match?.groups) return null;
	const { path, queryString } = match.groups;
	const params = querystring.parse(queryString);
	const refParam = Array.isArray(params.ref) ? params.ref[0] : params.ref;
	const versionParam = Array.isArray(params.version) ? params.version[0] : params.version;
	const currentValue = refParam ?? versionParam;
	if (!currentValue) return null;
	if (regEx(/(?:github\.com)(?::|\/)/).test(path)) return {
		currentValue,
		datasource: GithubTagsDatasource.id,
		depName: match.groups.project.replace(".git", "")
	};
	return {
		datasource: GitTagsDatasource.id,
		depName: path.replace(".git", ""),
		packageName: match.groups.url,
		currentValue
	};
}
function extractImage(image, aliases) {
	if (!image.name) return null;
	const nameToSplit = image.newName ?? image.name;
	if (!isString(nameToSplit)) {
		logger.debug({ image }, "Invalid image name");
		return null;
	}
	const nameDep = getDep(nameToSplit, false, aliases);
	const { depName } = nameDep;
	const { digest, newTag } = image;
	if (digest && newTag) {
		logger.debug({
			newTag,
			digest
		}, "Kustomize ignores newTag when digest is provided. Pick one, or use `newTag: tag@digest`");
		return {
			depName,
			currentValue: newTag,
			currentDigest: digest,
			skipReason: "invalid-dependency-specification"
		};
	}
	if (digest) {
		if (!isString(digest) || !digest.startsWith("sha256:")) return {
			depName,
			currentValue: digest,
			skipReason: "invalid-value"
		};
		return {
			...nameDep,
			currentDigest: digest,
			replaceString: digest
		};
	}
	if (newTag) {
		if (!isString(newTag) || newTag.startsWith("sha256:")) return {
			depName,
			currentValue: newTag,
			skipReason: "invalid-value"
		};
		return {
			...getDep(`${depName}:${newTag}`, false, aliases),
			replaceString: newTag,
			autoReplaceStringTemplate: "{{newValue}}{{#if newDigest}}@{{newDigest}}{{/if}}"
		};
	}
	if (image.newName) return {
		...nameDep,
		replaceString: image.newName
	};
	return null;
}
function extractHelmChart(helmChart, aliases) {
	if (!helmChart.name) return null;
	if (isOCIRegistry(helmChart.repo)) return {
		...getOciChartDep(helmChart.repo, helmChart.name, aliases),
		depName: helmChart.name,
		currentValue: helmChart.version
	};
	return {
		depName: helmChart.name,
		currentValue: helmChart.version,
		registryUrls: [helmChart.repo],
		datasource: HelmDatasource.id
	};
}
function parseKustomize(content, packageFile) {
	let pkg = null;
	try {
		pkg = parseSingleYaml(content);
	} catch /* istanbul ignore next */ {
		logger.debug({ packageFile }, "Error parsing kustomize file");
		return null;
	}
	if (!pkg || isString(pkg)) return null;
	pkg.kind ??= "Kustomization";
	if (!["Kustomization", "Component"].includes(pkg.kind)) return null;
	return pkg;
}
function extractPackageFile(content, packageFile, config) {
	logger.trace(`kustomize.extractPackageFile(${packageFile})`);
	const deps = [];
	const pkg = parseKustomize(content, packageFile);
	if (!pkg) return null;
	for (const base of coerceArray(pkg.bases).filter(isString)) {
		const dep = extractResource(base);
		if (dep) deps.push({
			...dep,
			depType: pkg.kind
		});
	}
	for (const resource of coerceArray(pkg.resources).filter(isString)) {
		const dep = extractResource(resource);
		if (dep) deps.push({
			...dep,
			depType: pkg.kind
		});
	}
	for (const component of coerceArray(pkg.components).filter(isString)) {
		const dep = extractResource(component);
		if (dep) deps.push({
			...dep,
			depType: pkg.kind
		});
	}
	for (const image of coerceArray(pkg.images)) {
		const dep = extractImage(image, config.registryAliases);
		if (dep) deps.push({
			...dep,
			depType: pkg.kind
		});
	}
	for (const helmChart of coerceArray(pkg.helmCharts)) {
		const dep = extractHelmChart(helmChart, config.registryAliases);
		if (dep) deps.push({
			...dep,
			depType: "HelmChart"
		});
	}
	if (!deps.length) return null;
	return { deps };
}
//#endregion
export { extractHelmChart, extractImage, extractPackageFile, extractResource, parseKustomize };

//# sourceMappingURL=extract.js.map