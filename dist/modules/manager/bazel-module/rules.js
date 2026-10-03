import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { clone } from "../../../util/clone.js";
import { BazelDatasource } from "../../datasource/bazel/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { RuleFragment, StringFragment } from "./parser/fragments.js";
import { isNonEmptyString } from "@sindresorhus/is";
import { z } from "zod/v4";
import parse from "github-url-from-git";
//#region lib/modules/manager/bazel-module/rules.ts
function isOverride(value) {
	return "bazelDepSkipReason" in value;
}
function isMerge(value) {
	return "bazelDepMergeFields" in value;
}
function bazelModulePackageDepToPackageDependency(bmpd) {
	const copy = clone(bmpd);
	// v8 ignore else -- TODO: add test #40625
	if (isOverride(copy)) {
		const partial = copy;
		delete partial.bazelDepSkipReason;
	}
	if (isMerge(copy)) {
		const partial = copy;
		delete partial.bazelDepMergeFields;
	}
	return copy;
}
const BazelDepToPackageDep = RuleFragment.extend({
	rule: z.literal("bazel_dep"),
	children: z.object({
		name: StringFragment,
		version: StringFragment.optional()
	})
}).transform(({ rule, children: { name, version } }) => ({
	datasource: BazelDatasource.id,
	depType: rule,
	depName: name.value,
	currentValue: version?.value,
	...version ? {} : { skipReason: "unspecified-version" }
}));
const GitOverrideToPackageDep = RuleFragment.extend({
	rule: z.literal("git_override"),
	children: z.object({
		module_name: StringFragment,
		remote: StringFragment,
		commit: StringFragment
	})
}).transform(({ rule, children: { module_name: moduleName, remote, commit } }) => {
	const override = {
		depType: rule,
		depName: moduleName.value,
		bazelDepSkipReason: "git-dependency",
		currentDigest: commit.value
	};
	const ghPackageName = githubPackageName(remote.value);
	if (isNonEmptyString(ghPackageName)) {
		override.datasource = GithubTagsDatasource.id;
		override.packageName = ghPackageName;
	} else override.skipReason = "unsupported-datasource";
	return override;
});
const SingleVersionOverrideToPackageDep = RuleFragment.extend({
	rule: z.literal("single_version_override"),
	children: z.object({
		module_name: StringFragment,
		version: StringFragment.optional(),
		registry: StringFragment.optional()
	})
}).transform(({ rule, children: { module_name: moduleName, version, registry } }) => {
	const base = {
		depType: rule,
		depName: moduleName.value,
		skipReason: "ignored"
	};
	if (version) {
		const override = base;
		override.bazelDepSkipReason = "is-pinned";
		override.currentValue = version.value;
	}
	// v8 ignore else -- TODO: add test #40625
	if (registry) {
		const merge = base;
		merge.bazelDepMergeFields = ["registryUrls"];
		merge.registryUrls = [registry.value];
	}
	return base;
});
const UnsupportedOverrideToPackageDep = RuleFragment.extend({
	rule: z.enum(["archive_override", "local_path_override"]),
	children: z.object({ module_name: StringFragment })
}).transform(({ rule, children: { module_name: moduleName } }) => {
	let bazelDepSkipReason = "unsupported";
	switch (rule) {
		case "archive_override":
			bazelDepSkipReason = "file-dependency";
			break;
		case "local_path_override": bazelDepSkipReason = "local-dependency";
	}
	return {
		depType: rule,
		depName: moduleName.value,
		skipReason: "unsupported-datasource",
		bazelDepSkipReason
	};
});
const RuleToBazelModulePackageDep = z.union([
	BazelDepToPackageDep,
	GitOverrideToPackageDep,
	SingleVersionOverrideToPackageDep,
	UnsupportedOverrideToPackageDep
]);
const githubRemoteRegex = regEx(/^https:\/\/github\.com\/(?<packageName>[^/]+\/.+)$/);
function githubPackageName(remote) {
	return parse(remote)?.match(githubRemoteRegex)?.groups?.packageName;
}
function collectByModule(packageDeps) {
	const rulesByModule = /* @__PURE__ */ new Map();
	for (const pkgDep of packageDeps) {
		const bmi = coerceArray(rulesByModule.get(pkgDep.depName));
		bmi.push(pkgDep);
		rulesByModule.set(pkgDep.depName, bmi);
	}
	return Array.from(rulesByModule.values());
}
function processModulePkgDeps(packageDeps) {
	if (!packageDeps.length) return [];
	const moduleName = packageDeps[0].depName;
	const bazelDep = packageDeps.find((pd) => pd.depType === "bazel_dep");
	if (!bazelDep) {
		logger.debug(`A 'bazel_dep' was not found for '${moduleName}'.`);
		return [];
	}
	const bazelDepOut = { ...bazelDep };
	const deps = [bazelDepOut];
	const merges = packageDeps.filter(isMerge);
	for (const merge of merges) merge.bazelDepMergeFields.forEach((k) => bazelDepOut[k] = merge[k]);
	const overrides = packageDeps.filter(isOverride);
	if (overrides.length === 0) return deps;
	if (overrides.length > 1) {
		const depTypes = overrides.map((o) => o.depType);
		logger.debug({
			depName: moduleName,
			depTypes
		}, "More than one override for a module was found");
		return deps;
	}
	const override = overrides[0];
	deps.push(bazelModulePackageDepToPackageDependency(override));
	bazelDepOut.skipReason = override.bazelDepSkipReason;
	return deps;
}
function toPackageDependencies(packageDeps) {
	return collectByModule(packageDeps).map(processModulePkgDeps).flat();
}
const GitRepositoryToPackageDep = RuleFragment.extend({
	rule: z.union([z.literal("git_repository"), z.literal("new_git_repository")]),
	children: z.object({
		name: StringFragment,
		remote: StringFragment,
		commit: StringFragment.optional(),
		tag: StringFragment.optional()
	})
}).transform(({ rule, children: { name, remote, commit, tag } }) => {
	const gitRepo = {
		depType: rule,
		depName: name.value
	};
	if (commit?.value) gitRepo.currentDigest = commit.value;
	if (tag?.value) gitRepo.currentValue = tag.value;
	const ghPackageName = githubPackageName(remote.value);
	if (isNonEmptyString(ghPackageName)) {
		gitRepo.datasource = GithubTagsDatasource.id;
		gitRepo.packageName = ghPackageName;
	} else gitRepo.skipReason = "unsupported-datasource";
	return gitRepo;
});
//#endregion
export { GitRepositoryToPackageDep, RuleToBazelModulePackageDep, bazelModulePackageDepToPackageDependency, processModulePkgDeps, toPackageDependencies };

//# sourceMappingURL=rules.js.map