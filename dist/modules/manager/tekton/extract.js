import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { getDep } from "../dockerfile/extract.js";
import { isFalsy, isNullOrUndefined, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/tekton/extract.ts
function extractPackageFile(content, packageFile) {
	logger.trace(`tekton.extractPackageFile(${packageFile})`);
	const deps = [];
	let docs;
	try {
		docs = parseYaml(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Failed to parse YAML resource as a Tekton resource");
		return null;
	}
	for (const doc of docs) deps.push(...getDeps(doc));
	if (!deps.length) return null;
	return { deps };
}
function getDeps(doc) {
	const deps = [];
	if (isFalsy(doc)) return deps;
	addStepActionImage(doc.spec, deps);
	addDep(doc.spec?.taskRef, deps);
	addStepImageSpec(doc.spec?.taskSpec, deps);
	addStepImageSpec(doc.spec, deps);
	addDep(doc.spec?.pipelineRef, deps);
	addPipelineAsCodeAnnotations(doc.metadata?.annotations, deps);
	const pipelineSpec = doc.spec?.pipelineSpec;
	if (isTruthy(pipelineSpec)) deps.push(...getDeps({ spec: pipelineSpec }));
	for (const task of [...coerceArray(doc.spec?.tasks), ...coerceArray(doc.spec?.finally)]) {
		addDep(task.taskRef, deps);
		addStepImageSpec(task.taskSpec, deps);
	}
	for (const resource of coerceArray(doc.spec?.resourcetemplates)) deps.push(...getDeps(resource));
	for (const item of coerceArray(doc.items)) deps.push(...getDeps(item));
	return deps;
}
const annotationRegex = regEx(/^pipelinesascode\.tekton\.dev\/(?:task(?:-[0-9]+)?|pipeline)$/);
function addPipelineAsCodeAnnotations(annotations, deps) {
	if (isNullOrUndefined(annotations)) return;
	for (const [key, value] of Object.entries(annotations)) {
		if (!annotationRegex.test(key)) continue;
		const values = value.replace(regEx(/]$/), "").replace(regEx(/^\[/), "").split(",");
		for (const value of values) {
			const dep = getAnnotationDep(value.trim());
			if (!dep) continue;
			deps.push(dep);
		}
	}
}
const githubRelease = regEx(/^(?<url>(?:(?:http|https):\/\/)?(?<path>(?:[^:/\s]+[:/])?(?<project>[^/\s]+\/[^/\s]+)))\/releases\/download\/(?<currentValue>.+)\/(?<subdir>[^?\s]*)$/);
const gitUrl = regEx(/^(?<url>(?:(?:http|https):\/\/)?(?<path>(?:[^:/\s]+[:/])?(?<project>[^/\s]+\/[^/\s]+)))(?:\/raw)?\/(?<currentValue>.+?)\/(?<subdir>[^?\s]*)$/);
function getAnnotationDep(url) {
	const dep = {};
	dep.depType = "tekton-annotation";
	let groups = githubRelease.exec(url)?.groups;
	if (groups) {
		dep.datasource = GithubReleasesDatasource.id;
		dep.depName = groups.path;
		dep.packageName = groups.project;
		dep.currentValue = groups.currentValue;
		return dep;
	}
	groups = gitUrl.exec(url)?.groups;
	if (groups) {
		dep.datasource = GitTagsDatasource.id;
		dep.depName = groups.path.replace("raw.githubusercontent.com", "github.com");
		dep.packageName = groups.url.replace("raw.githubusercontent.com", "github.com");
		dep.currentValue = groups.currentValue;
		return dep;
	}
	return null;
}
function addDep(ref, deps) {
	if (isFalsy(ref)) return;
	let imageRef;
	if (ref.resolver === "bundles") {
		imageRef = getBundleValue(ref.params);
		if (isNullOrUndefined(imageRef)) imageRef = getBundleValue(ref.resource);
	}
	if (isNullOrUndefined(imageRef)) imageRef = ref.bundle;
	const dep = getDep(imageRef);
	dep.depType = "tekton-bundle";
	logger.trace({
		depName: dep.depName,
		currentValue: dep.currentValue,
		currentDigest: dep.currentDigest
	}, "Tekton bundle dependency found");
	deps.push(dep);
}
function addStepImageSpec(spec, deps) {
	if (isNullOrUndefined(spec)) return;
	const steps = [
		...coerceArray(spec.steps),
		...coerceArray(spec.sidecars),
		spec.stepTemplate
	];
	for (const step of steps) {
		if (isNullOrUndefined(step?.image)) continue;
		const dep = getDep(step?.image);
		dep.depType = "tekton-step-image";
		logger.trace({
			depName: dep.depName,
			currentValue: dep.currentValue,
			currentDigest: dep.currentDigest
		}, "Tekton step image dependency found");
		deps.push(dep);
	}
}
function addStepActionImage(spec, deps) {
	if (isNullOrUndefined(spec)) return;
	if (isFalsy(spec.image)) return;
	const image = spec.image;
	const dep = getDep(image);
	dep.depType = "tekton-step-image";
	logger.trace({
		depName: dep.depName,
		currentValue: dep.currentValue,
		currentDigest: dep.currentDigest
	}, "Tekton step image dependency found");
	deps.push(dep);
}
function getBundleValue(fields) {
	for (const field of coerceArray(fields)) if (field.name === "bundle") return field.value;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map