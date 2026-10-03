import { regEx } from "../../../../util/regex.js";
import { DockerTarget, dockerRules } from "./docker.js";
import { GitTarget, gitRules } from "./git.js";
import { GoTarget, goRules } from "./go.js";
import { HttpTarget, httpRules } from "./http.js";
import { MavenTarget, mavenRules } from "./maven.js";
import { OciTarget, ociRules } from "./oci.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel/rules/index.ts
const Target = z.union([
	DockerTarget,
	OciTarget,
	GitTarget,
	GoTarget,
	HttpTarget,
	MavenTarget
]);
/**
* Gather all rule names supported by Renovate in order to speed up parsing
* by filtering out other syntactically correct rules we don't support yet.
*/
const supportedRules = [
	...dockerRules,
	...ociRules,
	...gitRules,
	...goRules,
	...httpRules,
	...mavenRules
];
const supportedRulesRegex = regEx(`^(?:${supportedRules.join("|")})$`);
function extractDepsFromFragmentData(fragmentData) {
	const res = Target.safeParse(fragmentData);
	if (!res.success) return [];
	return res.data;
}
function extractDepsFromFragment(fragment) {
	return extractDepsFromFragmentData(extract(fragment));
}
function extract(fragment) {
	if (fragment.type === "string") return fragment.value;
	if (fragment.type === "record") {
		const { children } = fragment;
		const result = {};
		for (const [key, value] of Object.entries(children)) result[key] = extract(value);
		return result;
	}
	return fragment.children.map(extract);
}
//#endregion
export { extract, extractDepsFromFragment, extractDepsFromFragmentData, supportedRulesRegex };

//# sourceMappingURL=index.js.map