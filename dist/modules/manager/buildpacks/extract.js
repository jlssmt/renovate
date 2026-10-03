import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { isValid as isVersion } from "../../versioning/semver/index.js";
import { BuildpacksRegistryDatasource } from "../../datasource/buildpacks-registry/index.js";
import { getDep as getDep$1 } from "../dockerfile/extract.js";
import { ProjectDescriptorToml, isBuildpackByName, isBuildpackByURI } from "./schema.js";
import { isArray } from "@sindresorhus/is";
//#region lib/modules/manager/buildpacks/extract.ts
const DOCKER_PREFIX = regEx(/^docker:\/?\//);
const dockerRef = regEx(/^(?:(?:(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)*)(?::\d{2,5}\/)?)?[a-z\d]+(?:(?:\.|_|__|-+)[a-z\d]+)*(?:\/[a-z\d]+(?:(?:\.|_|__|-+)[a-z\d]+)*)*(?::(?:\w[\w.-]{0,127})(?:@sha256:[A-Fa-f\d]{32,})?|@sha256:[A-Fa-f\d]{32,}))$/);
function isDockerRef(ref) {
	if (ref.startsWith("docker:/") || dockerRef.test(ref)) return true;
	return false;
}
const BUILDPACK_REGISTRY_PREFIX = "urn:cnb:registry:";
const buildpackRegistryId = regEx(/^[a-z0-9\-.]+\/[a-z0-9\-.]+(?:@(?<version>.+))?$/);
function isBuildpackRegistryId(ref) {
	const bpRegistryMatch = buildpackRegistryId.exec(ref);
	if (!bpRegistryMatch) return false;
	if (!bpRegistryMatch.groups?.version) return true;
	return isVersion(bpRegistryMatch.groups.version);
}
function isBuildpackRegistryRef(ref) {
	return isBuildpackRegistryId(ref) || ref.startsWith("urn:cnb:registry:");
}
function parseProjectToml(content, packageFile) {
	const res = ProjectDescriptorToml.safeParse(content);
	if (res.success) return res.data;
	logger.debug({
		packageFile,
		err: res.error
	}, "Failed to parse buildpacks project descriptor TOML");
	return null;
}
function extractPackageFile(content, packageFile, config) {
	const deps = [];
	const descriptor = parseProjectToml(content, packageFile);
	if (!descriptor) return null;
	if (descriptor.io?.buildpacks?.builder && isDockerRef(descriptor.io.buildpacks.builder)) {
		const dep = getDep$1(descriptor.io.buildpacks.builder.replace(DOCKER_PREFIX, ""), true, config.registryAliases);
		logger.trace({
			depName: dep.depName,
			currentValue: dep.currentValue,
			currentDigest: dep.currentDigest
		}, "Cloud Native Buildpacks builder");
		deps.push({
			...dep,
			commitMessageTopic: "builder {{depName}}"
		});
	}
	if (descriptor.io?.buildpacks?.group && isArray(descriptor.io.buildpacks.group)) {
		for (const group of descriptor.io.buildpacks.group) if (isBuildpackByURI(group) && isDockerRef(group.uri)) {
			const dep = getDep$1(group.uri.replace(DOCKER_PREFIX, ""), true, config.registryAliases);
			logger.trace({
				depName: dep.depName,
				currentValue: dep.currentValue,
				currentDigest: dep.currentDigest
			}, "Cloud Native Buildpack");
			deps.push(dep);
		} else if (isBuildpackByURI(group) && isBuildpackRegistryRef(group.uri)) {
			const dep = getDep(group.uri.replace(BUILDPACK_REGISTRY_PREFIX, ""));
			if (dep) deps.push(dep);
		} else if (isBuildpackByName(group)) {
			const version = group.version;
			if (version) {
				const dep = {
					datasource: BuildpacksRegistryDatasource.id,
					currentValue: version,
					packageName: group.id
				};
				deps.push(dep);
			}
		}
	}
	if (!deps.length) return null;
	return { deps };
}
function getDep(currentFrom) {
	if (currentFrom.includes("@")) {
		const dep = {
			datasource: BuildpacksRegistryDatasource.id,
			packageName: currentFrom.split("@")[0],
			autoReplaceStringTemplate: "{{depName}}{{#if newValue}}:{{newValue}}{{/if}}{{#if newDigest}}@{{newDigest}}{{/if}}"
		};
		dep.currentValue = currentFrom.split("@")[1];
		return dep;
	}
	return null;
}
//#endregion
export { BUILDPACK_REGISTRY_PREFIX, DOCKER_PREFIX, extractPackageFile, getDep, isBuildpackRegistryRef, isDockerRef };

//# sourceMappingURL=extract.js.map