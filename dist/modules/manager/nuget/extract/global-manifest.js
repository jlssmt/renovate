import { logger } from "../../../../logger/index.js";
import { DotnetVersionDatasource } from "../../../datasource/dotnet-version/index.js";
import { NugetDatasource } from "../../../datasource/nuget/index.js";
import { GlobalJson } from "../schema.js";
import { applyRegistries } from "../util.js";
//#region lib/modules/manager/nuget/extract/global-manifest.ts
function extractMsbuildGlobalManifest(content, packageFile, registries) {
	const deps = [];
	let manifest;
	let extractedConstraints;
	try {
		manifest = GlobalJson.parse(content);
	} catch {
		logger.debug({ packageFile }, `Invalid JSON`);
		return null;
	}
	if (!manifest["msbuild-sdks"] && !manifest.sdk?.version) {
		logger.debug({ packageFile }, "This global.json is not a Nuget file");
		return null;
	}
	if (manifest.sdk?.version) {
		deps.push({
			depType: "dotnet-sdk",
			depName: "dotnet-sdk",
			currentValue: manifest.sdk?.version,
			datasource: DotnetVersionDatasource.id
		});
		extractedConstraints = { "dotnet-sdk": manifest.sdk?.version };
	}
	if (manifest["msbuild-sdks"]) for (const depName of Object.keys(manifest["msbuild-sdks"])) {
		const dep = {
			depType: "msbuild-sdk",
			depName,
			currentValue: manifest["msbuild-sdks"][depName],
			datasource: NugetDatasource.id
		};
		applyRegistries(dep, registries);
		deps.push(dep);
	}
	return {
		deps,
		...extractedConstraints && { extractedConstraints }
	};
}
//#endregion
export { extractMsbuildGlobalManifest };

//# sourceMappingURL=global-manifest.js.map