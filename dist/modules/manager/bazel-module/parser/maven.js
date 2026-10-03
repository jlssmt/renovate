import { id } from "../../../versioning/gradle/index.js";
import { MavenDatasource } from "../../../datasource/maven/index.js";
import { ExtensionTagFragment, StringArrayFragment, StringFragment } from "./fragments.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel-module/parser/maven.ts
const artifactTag = "artifact";
const installTag = "install";
const commonDepType = "maven_install";
const mavenExtensionPrefix = "maven";
const mavenExtensionTags = [artifactTag, installTag];
function depTypeByTag(tag) {
	return `maven_${tag}`;
}
z.object({
	group: z.string(),
	artifact: z.string(),
	version: z.string()
});
const MavenArtifactTarget = ExtensionTagFragment.extend({
	extension: z.literal(mavenExtensionPrefix),
	tag: z.literal(artifactTag),
	children: z.object({
		artifact: StringFragment,
		group: StringFragment,
		version: StringFragment
	})
}).transform(({ children: { artifact, group, version } }) => [{
	datasource: MavenDatasource.id,
	versioning: id,
	depName: `${group.value}:${artifact.value}`,
	currentValue: version.value,
	depType: depTypeByTag(artifactTag)
}]);
const MavenInstallTarget = ExtensionTagFragment.extend({
	extension: z.literal(mavenExtensionPrefix),
	tag: z.literal(installTag),
	children: z.object({
		artifacts: StringArrayFragment.transform((artifacts) => {
			const result = [];
			for (const { value } of artifacts.items) {
				const [group, artifact, version] = value.split(":");
				// v8 ignore else -- TODO: add test #40625
				if (group && artifact && version) result.push({
					group,
					artifact,
					version
				});
			}
			return result;
		}),
		repositories: StringArrayFragment
	})
}).transform(({ children: { artifacts, repositories } }) => artifacts.map(({ group, artifact, version: currentValue }) => ({
	datasource: MavenDatasource.id,
	versioning: id,
	depName: `${group}:${artifact}`,
	currentValue,
	depType: depTypeByTag(installTag),
	registryUrls: repositories.items.map((i) => i.value)
})));
const RuleToMavenPackageDep = z.union([MavenArtifactTarget, MavenInstallTarget]);
function fillRegistryUrls(packageDeps) {
	const artifactRules = [];
	const registryUrls = [];
	const result = [];
	packageDeps.flat().forEach((dep) => {
		// v8 ignore else -- TODO: add test #40625
		if (dep.depType === depTypeByTag(installTag)) {
			// v8 ignore else -- TODO: add test #40625
			if (Array.isArray(dep.registryUrls)) {
				registryUrls.push(...dep.registryUrls);
				result.push(dep);
			}
		} else if (dep.depType === depTypeByTag(artifactTag)) artifactRules.push(dep);
	});
	const uniqUrls = [...new Set(registryUrls)];
	for (const artifactRule of artifactRules) {
		artifactRule.registryUrls = uniqUrls;
		artifactRule.depType = commonDepType;
		result.push(artifactRule);
	}
	return result;
}
//#endregion
export { RuleToMavenPackageDep, fillRegistryUrls, mavenExtensionPrefix, mavenExtensionTags };

//# sourceMappingURL=maven.js.map