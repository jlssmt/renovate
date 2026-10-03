import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { isHttpUrl } from "../../../util/url.js";
import { parseYaml } from "../../../util/yaml.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { BitbucketTagsDatasource } from "../../datasource/bitbucket-tags/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { getDep } from "../dockerfile/extract.js";
import { getOciChartDep, isOCIRegistry, removeOCIPrefix } from "../helmv3/oci.js";
import { isLocalChartPath } from "../helmv3/utils.js";
import { collectHelmRepos, isSystemManifest, systemManifestHeaderRegex } from "./common.js";
import { findDependencies } from "../helm-values/extract.js";
import { extractImage } from "../kustomize/extract.js";
import { FluxResource } from "./schema.js";
import { isString } from "@sindresorhus/is";
import { isMap, isPair, isScalar, parseAllDocuments } from "yaml";
//#region lib/modules/manager/flux/extract.ts
function readManifest(content, packageFile) {
	if (isSystemManifest(packageFile)) {
		const versionMatch = regEx(systemManifestHeaderRegex).exec(content);
		if (!versionMatch) return null;
		return {
			kind: "system",
			file: packageFile,
			content,
			version: versionMatch[1],
			components: versionMatch[2]
		};
	}
	return {
		kind: "resource",
		file: packageFile,
		content,
		resources: parseYaml(content, {
			customSchema: FluxResource,
			failureBehaviour: "filter",
			removeTemplates: true
		})
	};
}
const githubUrlRegex = regEx(/^(?:https:\/\/|git@)github\.com[/:](?<packageName>[^/]+\/[^/]+?)(?:\.git)?$/);
const gitlabUrlRegex = regEx(/^(?:https:\/\/|git@)gitlab\.com[/:](?<packageName>[^/]+\/[^/]+?)(?:\.git)?$/);
const bitbucketUrlRegex = regEx(/^(?:https:\/\/|git@)bitbucket\.org[/:](?<packageName>[^/]+\/[^/]+?)(?:\.git)?$/);
function resolveGitRepositoryPerSourceTag(dep, gitUrl) {
	const githubMatchGroups = githubUrlRegex.exec(gitUrl)?.groups;
	if (githubMatchGroups) {
		dep.datasource = GithubTagsDatasource.id;
		dep.packageName = githubMatchGroups.packageName;
		dep.sourceUrl = `https://github.com/${dep.packageName}`;
		return;
	}
	const gitlabMatchGroups = gitlabUrlRegex.exec(gitUrl)?.groups;
	if (gitlabMatchGroups) {
		dep.datasource = GitlabTagsDatasource.id;
		dep.packageName = gitlabMatchGroups.packageName;
		dep.sourceUrl = `https://gitlab.com/${dep.packageName}`;
		return;
	}
	const bitbucketMatchGroups = bitbucketUrlRegex.exec(gitUrl)?.groups;
	if (bitbucketMatchGroups) {
		dep.datasource = BitbucketTagsDatasource.id;
		dep.packageName = bitbucketMatchGroups.packageName;
		dep.sourceUrl = `https://bitbucket.org/${dep.packageName}`;
		return;
	}
	dep.datasource = GitTagsDatasource.id;
	dep.packageName = gitUrl;
	if (isHttpUrl(gitUrl)) dep.sourceUrl = gitUrl.replace(regEx(/\.git$/), "");
}
function resolveHelmRepository(dep, matchingRepositories, registryAliases, sourceRefName) {
	if (matchingRepositories.length) {
		dep.registryUrls = matchingRepositories.map((repo) => {
			if (repo.spec.type === "oci" || isOCIRegistry(repo.spec.url)) {
				Object.assign(dep, getOciChartDep(repo.spec.url, dep.depName, registryAliases));
				return null;
			}
			return repo.spec.url;
		}).filter(isString);
		if (!dep.registryUrls?.length) delete dep.registryUrls;
		return;
	}
	if (sourceRefName && registryAliases) {
		const aliasUrl = registryAliases[sourceRefName];
		if (aliasUrl) {
			if (isOCIRegistry(aliasUrl)) Object.assign(dep, getOciChartDep(aliasUrl, dep.depName, registryAliases));
			else dep.registryUrls = [aliasUrl];
			return;
		}
	}
	dep.skipReason = "unknown-registry";
}
function resolveSystemManifest(manifest) {
	return [{
		depName: "fluxcd/flux2",
		datasource: GithubReleasesDatasource.id,
		currentValue: manifest.version,
		managerData: { components: manifest.components }
	}];
}
/**
* Returns all `spec.ref` map nodes for OCIRepository resources matching `resourceName`.
*/
function findOCIRefNodes(docs, resourceName) {
	const refNodes = [];
	for (const doc of docs) {
		const docContents = doc.contents;
		if (!isMap(docContents)) continue;
		const kindNode = docContents.get("kind", true);
		if (!isScalar(kindNode) || kindNode.value !== "OCIRepository") continue;
		const nameNode = docContents.getIn(["metadata", "name"], true);
		if (!isScalar(nameNode) || nameNode.value !== resourceName) continue;
		const specNode = docContents.get("spec");
		if (!isMap(specNode)) continue;
		const refNode = specNode.get("ref");
		if (isMap(refNode)) refNodes.push(refNode);
	}
	return refNodes;
}
function extractOCIRefTagAndDigestRange(docs, content, resourceName) {
	for (const refNode of findOCIRefNodes(docs, resourceName)) {
		let tagKey;
		let tagValue;
		let digestKey;
		let digestValue;
		for (const item of refNode.items) {
			if (!isPair(item) || !isScalar(item.key)) continue;
			if (item.key.value === "tag" && isScalar(item.value)) {
				tagKey = item.key;
				tagValue = item.value;
			} else if (item.key.value === "digest" && isScalar(item.value)) {
				digestKey = item.key;
				digestValue = item.value;
			}
		}
		if (!tagKey?.range || !tagValue?.range || !digestKey?.range || !digestValue?.range) continue;
		const tagFirst = tagKey.range[0] < digestKey.range[0];
		const start = tagFirst ? tagKey.range[0] : digestKey.range[0];
		const end = tagFirst ? digestValue.range[1] : tagValue.range[1];
		return {
			replaceString: content.slice(start, end),
			tagFirst
		};
	}
	return null;
}
function extractOCIRefTagRange(docs, content, resourceName) {
	for (const refNode of findOCIRefNodes(docs, resourceName)) for (const item of refNode.items) if (isPair(item) && isScalar(item.key) && item.key.value === "tag" && isScalar(item.value) && item.key.range && item.value.range) {
		const keyStart = item.key.range[0];
		const valueEnd = item.value.range[1];
		const lineStart = content.lastIndexOf("\n", keyStart - 1) + 1;
		return {
			replaceString: content.slice(keyStart, valueEnd),
			indentation: content.slice(lineStart, keyStart)
		};
	}
	return null;
}
function resolveResourceManifest(manifest, helmRepositories, registryAliases, content) {
	let docs;
	const deps = [];
	for (const resource of manifest.resources) switch (resource.kind) {
		case "HelmRelease":
			if (resource.spec.chartRef) logger.trace("HelmRelease using chartRef was found, skipping as version will be handled via referenced resource directly");
			else if (resource.spec.chart) {
				const chartSpec = resource.spec.chart.spec;
				const depName = chartSpec.chart;
				const dep = {
					depName,
					currentValue: resource.spec.chart.spec.version,
					datasource: HelmDatasource.id
				};
				if (isLocalChartPath(depName)) {
					dep.skipReason = "local-chart";
					delete dep.datasource;
				} else {
					const sourceRef = chartSpec.sourceRef;
					resolveHelmRepository(dep, helmRepositories.filter((rep) => rep.kind === sourceRef?.kind && rep.metadata.name === sourceRef.name && rep.metadata.namespace === (sourceRef?.namespace ?? resource.metadata?.namespace)), registryAliases, sourceRef?.name);
				}
				deps.push(dep);
			} else logger.debug(`invalid or incomplete ${resource.metadata.name} HelmRelease spec, skipping`);
			if (resource.spec.values) {
				logger.trace("detecting dependencies in HelmRelease values");
				deps.push(...findDependencies(resource.spec.values, registryAliases));
			}
			break;
		case "HelmChart": {
			if (resource.spec.sourceRef.kind === "GitRepository") {
				logger.trace("HelmChart using GitRepository was found, skipping as version will be handled via referenced resource directly");
				continue;
			}
			const dep = { depName: resource.spec.chart };
			if (resource.spec.sourceRef.kind === "HelmRepository") {
				dep.currentValue = resource.spec.version;
				dep.datasource = HelmDatasource.id;
				const sourceRef = resource.spec.sourceRef;
				resolveHelmRepository(dep, helmRepositories.filter((rep) => rep.kind === sourceRef?.kind && rep.metadata.name === sourceRef.name && rep.metadata.namespace === resource.metadata?.namespace), registryAliases, sourceRef?.name);
			} else dep.skipReason = "unsupported-datasource";
			deps.push(dep);
			break;
		}
		case "GitRepository": {
			const dep = { depName: resource.metadata.name };
			if (resource.spec.ref?.commit) {
				const gitUrl = resource.spec.url;
				dep.currentDigest = resource.spec.ref.commit;
				dep.datasource = GitRefsDatasource.id;
				dep.packageName = gitUrl;
				dep.replaceString = resource.spec.ref.commit;
				if (isHttpUrl(gitUrl)) dep.sourceUrl = gitUrl.replace(regEx(/\.git$/), "");
				if (resource.spec.ref?.branch) dep.currentValue = resource.spec.ref.branch;
			} else if (resource.spec.ref?.tag) {
				dep.currentValue = resource.spec.ref.tag;
				resolveGitRepositoryPerSourceTag(dep, resource.spec.url);
			} else dep.skipReason = "unversioned-reference";
			deps.push(dep);
			break;
		}
		case "OCIRepository": {
			const container = removeOCIPrefix(resource.spec.url);
			if (resource.spec.ref?.digest && resource.spec.ref?.tag) {
				const combinedDep = getDep(`${container}@${resource.spec.ref.digest}`, false, registryAliases);
				combinedDep.currentValue = resource.spec.ref.tag;
				const refRange = extractOCIRefTagAndDigestRange(docs ??= parseAllDocuments(content, { strict: false }), content, resource.metadata.name);
				if (refRange) {
					combinedDep.replaceString = refRange.replaceString;
					if (refRange.tagFirst) combinedDep.autoReplaceStringTemplate = refRange.replaceString.replace(resource.spec.ref.tag, "{{newValue}}").replace(resource.spec.ref.digest, "{{newDigest}}");
					else combinedDep.autoReplaceStringTemplate = refRange.replaceString.replace(resource.spec.ref.digest, "{{newDigest}}").replace(resource.spec.ref.tag, "{{newValue}}");
				} else {
					logger.debug({
						file: manifest.file,
						name: resource.metadata.name
					}, "Could not find tag/digest nodes in content, skipping replacement");
					combinedDep.skipReason = "invalid-value";
				}
				deps.push(combinedDep);
			} else if (resource.spec.ref?.digest) {
				const dep = getDep(`${container}@${resource.spec.ref.digest}`, false, registryAliases);
				deps.push(dep);
			} else if (resource.spec.ref?.tag) {
				const dep = getDep(`${container}:${resource.spec.ref.tag}`, false, registryAliases);
				const refTagRange = extractOCIRefTagRange(docs ??= parseAllDocuments(content, { strict: false }), content, resource.metadata.name);
				if (refTagRange) {
					dep.replaceString = refTagRange.replaceString;
					const newline = content.includes("\r\n") ? "\r\n" : "\n";
					dep.autoReplaceStringTemplate = `${refTagRange.replaceString.replace(resource.spec.ref.tag, "{{newValue}}")}{{#if newDigest}}${newline}${refTagRange.indentation}digest: {{newDigest}}{{/if}}`;
				} else {
					logger.debug({
						file: manifest.file,
						name: resource.metadata.name
					}, "Unable to locate tag node for replacement (may be YAML alias or alias reference), digest pinning will not be possible");
					dep.replaceString = resource.spec.ref.tag;
					dep.autoReplaceStringTemplate = "{{newValue}}";
				}
				deps.push(dep);
			} else {
				const dep = getDep(container, false, registryAliases);
				dep.skipReason = "unversioned-reference";
				deps.push(dep);
			}
			break;
		}
		case "Kustomization": for (const image of coerceArray(resource.spec.images)) {
			const dep = extractImage(image, registryAliases);
			// v8 ignore else -- the schema rejects an image without a name
			if (dep) deps.push(dep);
		}
	}
	return deps;
}
function extractPackageFile(content, packageFile, config) {
	const manifest = readManifest(content, packageFile);
	if (!manifest) return null;
	const helmRepositories = collectHelmRepos([manifest]);
	let deps = null;
	switch (manifest.kind) {
		case "system":
			deps = resolveSystemManifest(manifest);
			break;
		case "resource": deps = resolveResourceManifest(manifest, helmRepositories, config?.registryAliases, content);
	}
	return deps?.length ? { deps } : null;
}
async function extractAllPackageFiles(config, packageFiles) {
	const manifests = [];
	const results = [];
	for (const file of packageFiles) {
		const content = await readLocalFile(file, "utf8");
		if (content) {
			const manifest = readManifest(content, file);
			if (manifest) manifests.push(manifest);
		}
	}
	const helmRepositories = collectHelmRepos(manifests);
	for (const manifest of manifests) {
		let deps = null;
		switch (manifest.kind) {
			case "system":
				deps = resolveSystemManifest(manifest);
				break;
			case "resource": deps = resolveResourceManifest(manifest, helmRepositories, config.registryAliases, manifest.content);
		}
		if (deps?.length) results.push({
			packageFile: manifest.file,
			deps
		});
	}
	return results.length ? results : null;
}
//#endregion
export { extractAllPackageFiles, extractPackageFile };

//# sourceMappingURL=extract.js.map