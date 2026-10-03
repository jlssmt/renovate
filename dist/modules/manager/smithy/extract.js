import { logger } from "../../../logger/index.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { SmithyBuild } from "./schema.js";
//#region lib/modules/manager/smithy/extract.ts
function extractPackageFile(content, packageFile) {
	let parsed;
	try {
		parsed = SmithyBuild.parse(content);
	} catch (err) {
		logger.debug({
			err,
			packageFile
		}, "Error parsing smithy-build.json");
		return null;
	}
	const dependencies = parsed.maven?.dependencies;
	if (!dependencies?.length) return null;
	const deps = dependencies.map(gavToPackageDependency);
	const registryUrls = parsed.maven?.repositories?.map((repository) => repository.url).filter((url) => !url.includes("${"));
	return {
		deps,
		...registryUrls?.length ? { registryUrls } : {}
	};
}
function gavToPackageDependency(gav) {
	const parts = gav.split(":");
	const [groupId, artifactId, currentValue] = parts;
	if (!groupId || !artifactId || parts.length > 3 || groupId.includes("${") || artifactId.includes("${")) return {
		depName: gav,
		skipReason: gav.includes("${") ? "contains-variable" : "invalid-dependency-specification"
	};
	const depName = `${groupId}:${artifactId}`;
	if (!currentValue) return {
		depName,
		datasource: MavenDatasource.id,
		skipReason: "unspecified-version"
	};
	if (currentValue.includes("${")) return {
		depName,
		datasource: MavenDatasource.id,
		skipReason: "contains-variable"
	};
	return {
		depName,
		currentValue,
		datasource: MavenDatasource.id
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map