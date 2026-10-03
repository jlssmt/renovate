import { CrateDatasource } from "../../../datasource/crate/index.js";
import { applyGitSource } from "../../util.js";
import { ExtensionTagFragment, StringFragment } from "./fragments.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel-module/parser/crate.ts
const crateExtensionPrefix = "crate";
const specTag = "spec";
const crateExtensionTags = [specTag];
const RuleToCratePackageDep = ExtensionTagFragment.extend({
	extension: z.literal(crateExtensionPrefix),
	tag: z.literal(specTag),
	children: z.object({
		/** Git branch for the dependency */
		branch: StringFragment.optional(),
		/** Git URL for the dependency */
		git: StringFragment.optional(),
		/** Name of a package to look up */
		package: StringFragment,
		/** Path on disk to the crate sources */
		path: StringFragment.optional(),
		/** Git revision for the dependency */
		rev: StringFragment.optional(),
		/** Git tag for the dependency */
		tag: StringFragment.optional(),
		/** Semver version */
		version: StringFragment.optional()
	})
}).transform(({ children: { package: packageName, version, git, rev, tag, branch, path } }) => {
	let skipReason;
	let currentValue;
	let nestedVersion = false;
	if (version?.value) {
		currentValue = version.value;
		nestedVersion = true;
	} else currentValue = "";
	const dep = {
		datasource: CrateDatasource.id,
		depName: packageName.value,
		currentValue,
		depType: "crate_spec",
		managerData: { nestedVersion }
	};
	if (path) skipReason = "path-dependency";
	else if (git?.value) applyGitSource(dep, git.value, rev?.value, tag?.value, branch?.value);
	else if (!version) skipReason = "invalid-dependency-specification";
	if (skipReason) dep.skipReason = skipReason;
	return dep;
});
//#endregion
export { RuleToCratePackageDep, crateExtensionPrefix, crateExtensionTags };

//# sourceMappingURL=crate.js.map