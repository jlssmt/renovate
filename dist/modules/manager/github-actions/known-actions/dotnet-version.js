import "../../../versioning/npm/index.js";
import { DotnetVersionDatasource } from "../../../datasource/dotnet-version/index.js";
import { valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/dotnet-version.ts
const dotnetVersionActions = { "actions/setup-dotnet": {
	datasource: DotnetVersionDatasource.id,
	packageName: "dotnet-sdk",
	versioning: "npm",
	withSchema: valSchema("dotnet-version", (val) => val.includes("\n"))
} };
//#endregion
export { dotnetVersionActions };

//# sourceMappingURL=dotnet-version.js.map