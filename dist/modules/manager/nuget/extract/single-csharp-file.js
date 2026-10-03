import { regEx } from "../../../../util/regex.js";
import { NugetDatasource } from "../../../datasource/nuget/index.js";
import { applyRegistries } from "../util.js";
//#region lib/modules/manager/nuget/extract/single-csharp-file.ts
const packageRegex = regEx(/^#:(?<type>package|sdk)\s+(?<depName>[A-Za-z0-9_.-]+)@(?<currentValue>[0-9][^\s]*)/, "gm");
function extractPackagesFromSingleCsharpFile(content, packageFile, registries) {
	const deps = [];
	for (const match of content.matchAll(packageRegex)) {
		const { type, depName, currentValue } = match.groups;
		const dep = {
			depName,
			currentValue,
			datasource: NugetDatasource.id,
			depType: type === "package" ? "nuget" : "msbuild-sdk"
		};
		applyRegistries(dep, registries);
		deps.push(dep);
	}
	return { deps };
}
//#endregion
export { extractPackagesFromSingleCsharpFile };

//# sourceMappingURL=single-csharp-file.js.map