import { regEx } from "../../../../util/regex.js";
import { JavaVersionDatasource } from "../../../datasource/java-version/index.js";
import { isPartialVersion, parsePartialValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/java-version-dynamic.ts
const supportedJavaDistributions = /* @__PURE__ */ new Set(["temurin", "adopt"]);
const exactJavaVersionRegex = regEx(/^\d+\.\d+\.\d+(?:[+-]\S+)?$/);
/**
* Parse a `java-version` input, which per actions/setup-java' and graalvm/setup-graalvm's docs, may be a version, a semver range, an early-access version or `latest`.
*
* A whole version (`21`, `21.0`) keeps their precision through `semver-partial` versioning.
*
* Exact versions are looked up as-is.
*
* Other forms of versions (`21.x`, `>=21`, `21-ea`, `latest`, ...) are skipped, as we can't provide a recommended bump at this time.
*/
function parseJavaVersion(version) {
	if (version && !isPartialVersion(version) && !exactJavaVersionRegex.test(version)) return {
		currentValue: version,
		depType: "uses-with",
		skipStage: "extract",
		skipReason: "unsupported-version"
	};
	return parsePartialValue(version);
}
const SetupJavaWith = z.object({
	distribution: z.string().optional(),
	"java-version": z.string().optional(),
	"java-package": z.string().optional()
}).transform(({ distribution, "java-version": version, "java-package": javaPackage }) => {
	const packageName = javaPackage?.startsWith("jre") ? "java-jre" : "java-jdk";
	if (!distribution || !supportedJavaDistributions.has(distribution.toLowerCase())) return [{
		packageName,
		depType: "uses-with",
		skipStage: "extract",
		skipReason: "unsupported"
	}];
	return [{
		packageName,
		...parseJavaVersion(version)
	}];
});
const javaVersionDynamicActions = { "actions/setup-java": {
	datasource: JavaVersionDatasource.id,
	packageName: "",
	withSchema: SetupJavaWith
} };
//#endregion
export { javaVersionDynamicActions, parseJavaVersion };

//# sourceMappingURL=java-version-dynamic.js.map