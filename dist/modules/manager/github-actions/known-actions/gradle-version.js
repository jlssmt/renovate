import { id } from "../../../versioning/gradle/index.js";
import { GradleVersionDatasource } from "../../../datasource/gradle-version/index.js";
import { valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/gradle-version.ts
/**
* `gradle/actions/setup-gradle` has a few `gradle-version`s that are strings used to denote another source than a specific version number, which shouldn't have an update proposed for.
*/
const GradleVersionAliases = /* @__PURE__ */ new Set([
	"wrapper",
	"current",
	"release-candidate",
	"nightly",
	"release-nightly"
]);
const gradleVersionActions = { "gradle/actions/setup-gradle": {
	datasource: GradleVersionDatasource.id,
	depName: "gradle",
	packageName: "gradle/gradle",
	versioning: id,
	withSchema: valSchema("gradle-version", (val) => GradleVersionAliases.has(val))
} };
//#endregion
export { gradleVersionActions };

//# sourceMappingURL=gradle-version.js.map