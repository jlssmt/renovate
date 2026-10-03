import { DockerDatasource } from "../../datasource/docker/index.js";
import { RepoRuleCallFragment, StringFragment } from "./parser/fragments.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel-module/rules-img.ts
const RulesImgPullCallToDep = RepoRuleCallFragment.extend({ children: z.object({
	name: StringFragment,
	repository: StringFragment,
	registry: StringFragment.optional(),
	tag: StringFragment.optional(),
	digest: StringFragment.optional()
}) }).transform(({ rawString, children: { name, repository, registry, tag, digest } }) => {
	let packageName = repository.value;
	if (registry?.value) packageName = `${registry.value}/${repository.value}`;
	const result = {
		datasource: DockerDatasource.id,
		depType: "rules_img_pull",
		depName: name.value,
		packageName,
		currentValue: tag?.value,
		currentDigest: digest?.value,
		replaceString: rawString
	};
	if (registry?.value) result.registryUrls = [`https://${registry.value}`];
	return result;
});
function transformRulesImgCalls(fragments) {
	const deps = [];
	const repoRuleVariables = /* @__PURE__ */ new Map();
	for (const fragment of fragments) if (fragment.type === "useRepoRule") repoRuleVariables.set(fragment.variableName, {
		bzlFile: fragment.bzlFile,
		ruleName: fragment.ruleName
	});
	for (const fragment of fragments) if (fragment.type === "repoRuleCall") {
		const functionName = fragment.functionName;
		if (!repoRuleVariables.has(functionName)) continue;
		if (!repoRuleVariables.get(functionName)?.bzlFile.includes("@rules_img//img:pull.bzl")) continue;
		try {
			const dep = RulesImgPullCallToDep.parse(fragment);
			deps.push(dep);
		} catch {
			continue;
		}
	}
	return deps;
}
//#endregion
export { RulesImgPullCallToDep, transformRulesImgCalls };

//# sourceMappingURL=rules-img.js.map