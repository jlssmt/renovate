import { regEx } from "../../../../util/regex.js";
import { GoDatasource } from "../../../datasource/go/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel/rules/go.ts
const goRules = ["go_repository", "_go_repository"];
const GoTarget = z.object({
	rule: z.enum(goRules),
	name: z.string(),
	tag: z.string().optional(),
	commit: z.string().optional(),
	importpath: z.string(),
	remote: z.string().optional()
}).refine(({ tag, commit }) => !!tag || !!commit).transform(({ rule, name, tag, commit, importpath, remote }) => {
	const dep = {
		datasource: GoDatasource.id,
		depType: rule,
		depName: name,
		packageName: importpath
	};
	if (tag) dep.currentValue = tag;
	if (commit) {
		dep.currentDigest = commit;
		if (!tag) dep.digestOneAndOnly = true;
	}
	if (remote) {
		if (regEx(/https:\/\/github\.com(?:.*\/)(?:(?:[a-zA-Z]+)(?:-)?(?:[a-zA-Z]+))/).exec(remote)?.[0].length === remote.length) dep.packageName = remote.replace("https://", "");
		else dep.skipReason = "unsupported-remote";
	}
	return [dep];
});
//#endregion
export { GoTarget, goRules };

//# sourceMappingURL=go.js.map