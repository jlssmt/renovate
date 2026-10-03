import { DartVersionDatasource } from "../../../datasource/dart-version/index.js";
import { partialValSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/dart-version.ts
const dartVersionActions = { "dart-lang/setup-dart": {
	datasource: DartVersionDatasource.id,
	depName: "dart",
	packageName: "dart-lang/sdk",
	withSchema: partialValSchema("sdk")
} };
//#endregion
export { dartVersionActions };

//# sourceMappingURL=dart-version.js.map