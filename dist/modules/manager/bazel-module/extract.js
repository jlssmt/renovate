import { regEx } from "../../../util/regex.js";
import { isNotNullOrUndefined } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { getDep } from "../dockerfile/extract.js";
import { read } from "./bazelrc.js";
import { RuleToCratePackageDep } from "./parser/crate.js";
import { RuleToMavenPackageDep, fillRegistryUrls } from "./parser/maven.js";
import { RuleToDockerPackageDep } from "./parser/oci.js";
import { parse } from "./parser/index.js";
import { GitRepositoryToPackageDep, RuleToBazelModulePackageDep, toPackageDependencies } from "./rules.js";
import { transformRulesImgCalls } from "./rules-img.js";
import upath from "upath";
//#region lib/modules/manager/bazel-module/extract.ts
async function extractPackageFile(content, packageFile, config) {
	try {
		const records = parse(content);
		const pfc = await extractBazelPfc(records, packageFile);
		const gitRepositoryDeps = extractGitRepositoryDeps(records);
		const mavenDeps = extractMavenDeps(records);
		const dockerDeps = LooseArray(RuleToDockerPackageDep).transform((deps) => deps.map((dep) => {
			const imageRef = `${dep.packageName}${dep.currentValue ? `:${dep.currentValue}` : ""}${dep.currentDigest ? `@${dep.currentDigest}` : ""}`;
			return {
				...getDep(imageRef, false, config?.registryAliases),
				depType: "oci_pull",
				depName: dep.depName,
				replaceString: dep.replaceString
			};
		})).parse(records);
		const rulesImgDeps = transformRulesImgCalls(records);
		const crateDeps = LooseArray(RuleToCratePackageDep).parse(records);
		if (gitRepositoryDeps.length) pfc.deps.push(...gitRepositoryDeps);
		if (mavenDeps.length) pfc.deps.push(...mavenDeps);
		if (dockerDeps.length) pfc.deps.push(...dockerDeps);
		if (rulesImgDeps.length) pfc.deps.push(...rulesImgDeps);
		if (crateDeps.length) pfc.deps.push(...crateDeps);
		return pfc.deps.length ? pfc : null;
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Failed to parse bazel module file.");
		return null;
	}
}
async function extractBazelPfc(records, packageFile) {
	const pfc = LooseArray(RuleToBazelModulePackageDep).transform(toPackageDependencies).transform((deps) => ({ deps })).parse(records);
	const registryUrls = (await read(upath.dirname(packageFile))).filter((ce) => ce.config === void 0).map((ce) => ce.getOption("registry")?.value).map((url) => url?.replace(regEx(/^["']|["']$/g), "")).filter(isNotNullOrUndefined);
	if (registryUrls.length) pfc.registryUrls = registryUrls;
	return pfc;
}
function extractGitRepositoryDeps(records) {
	return LooseArray(GitRepositoryToPackageDep).parse(records);
}
function extractMavenDeps(records) {
	return LooseArray(RuleToMavenPackageDep).transform(fillRegistryUrls).parse(records);
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map