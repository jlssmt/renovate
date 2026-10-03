import { dockerRules } from "./rules/docker.js";
import { gitRules } from "./rules/git.js";
import { goRules } from "./rules/go.js";
import { ociRules } from "./rules/oci.js";
import { extractDepsFromFragment } from "./rules/index.js";
import { parse } from "./parser.js";
//#region lib/modules/manager/bazel/extract.ts
function extractPackageFile(content, packageFile) {
	const deps = [];
	const fragments = parse(content, packageFile);
	if (!fragments) return null;
	for (let idx = 0; idx < fragments.length; idx += 1) {
		const fragment = fragments[idx];
		for (const dep of extractDepsFromFragment(fragment)) {
			dep.managerData = { idx };
			const rules = [
				...dockerRules,
				...ociRules,
				...gitRules,
				...goRules
			];
			const replaceString = fragment.value;
			if (rules.some((rule) => replaceString.startsWith(rule)) && dep.currentValue && dep.currentDigest) dep.replaceString = replaceString;
			deps.push(dep);
		}
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map