import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { id } from "../../versioning/docker/index.js";
import { getDep } from "../dockerfile/extract.js";
import { getHelmValuesSiblingVersion, matchesHelmValuesDockerHeuristic, matchesHelmValuesInlineImage } from "./util.js";
import { isObject } from "@sindresorhus/is";
//#region lib/modules/manager/helm-values/extract.ts
function getHelmDep(registry, repository, tag, registryAliases) {
	const dep = getDep(`${registry}${repository}:${tag}`, false, registryAliases);
	dep.replaceString = tag;
	dep.versioning = id;
	dep.autoReplaceStringTemplate = "{{newValue}}{{#if newDigest}}@{{newDigest}}{{/if}}";
	return dep;
}
/**
* Recursively find all supported dependencies in the yaml object.
*
* @param parsedContent
*/
function findDependencies(parsedContent, registryAliases) {
	return findDependenciesInternal(parsedContent, [], registryAliases);
}
function findDependenciesInternal(parsedContent, packageDependencies, registryAliases) {
	if (!isObject(parsedContent)) return packageDependencies;
	Object.entries(parsedContent).forEach(([key, value]) => {
		if (matchesHelmValuesDockerHeuristic(key, value)) {
			const currentItem = value;
			let registry = currentItem.registry;
			registry = registry ? `${registry}/` : "";
			const repository = String(currentItem.repository);
			const tag = `${currentItem.tag ?? currentItem.version}`;
			packageDependencies.push(getHelmDep(registry, repository, tag, registryAliases));
		} else if (matchesHelmValuesInlineImage(key, value)) {
			const dep = getDep(value, true, registryAliases);
			if (!dep.currentValue && !dep.currentDigest) {
				const siblingVersion = getHelmValuesSiblingVersion(parsedContent);
				if (siblingVersion) packageDependencies.push(getHelmDep("", value, siblingVersion, registryAliases));
				else packageDependencies.push(dep);
			} else packageDependencies.push(dep);
		} else findDependenciesInternal(value, packageDependencies, registryAliases);
	});
	return packageDependencies;
}
function extractPackageFile(content, packageFile, config) {
	let parsedContent;
	try {
		parsedContent = parseYaml(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Failed to parse helm-values YAML");
		return null;
	}
	try {
		const deps = [];
		for (const con of parsedContent) deps.push(...findDependencies(con, config.registryAliases));
		if (deps.length) return { deps };
	} catch (err) /* istanbul ignore next */ {
		logger.debug({
			err,
			packageFile
		}, "Error parsing helm-values parsed content");
	}
	return null;
}
//#endregion
export { extractPackageFile, findDependencies, findDependenciesInternal };

//# sourceMappingURL=extract.js.map