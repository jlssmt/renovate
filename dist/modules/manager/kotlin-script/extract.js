import { regEx } from "../../../util/regex.js";
import { MavenDatasource } from "../../datasource/maven/index.js";
import { isString, isTruthy } from "@sindresorhus/is";
//#region lib/modules/manager/kotlin-script/extract.ts
const dependsOnBlockRegex = regEx(/@file\s*:\s*DependsOn\s*\((?<args>[^)]*)\)/g);
const dependencyRegex = regEx(/(?<replaceString>"(?<groupId>[^:"]+):(?<artifactId>[^:"]+):(?<version>[^"]+)")/g);
const repositoryBlockRegex = regEx(/@file\s*:\s*Repository\s*\((?<args>[^)]*)\)/g);
const repositoryUrlRegex = regEx(/"(?<repositoryName>[^"]+)"/g);
function extractPackageFile(fileContent) {
	const registryUrls = [...fileContent.matchAll(repositoryBlockRegex)].flatMap((block) => [...block.groups.args.matchAll(repositoryUrlRegex)]).map((match) => match.groups?.repositoryName).filter(isString);
	const deps = [];
	for (const block of fileContent.matchAll(dependsOnBlockRegex)) {
		const matches = [...block.groups.args.matchAll(dependencyRegex)].map((m) => m.groups).filter(isTruthy);
		for (const match of matches) {
			const dep = {
				currentValue: match.version,
				depName: `${match.groupId}:${match.artifactId}`,
				replaceString: match.replaceString,
				datasource: MavenDatasource.id
			};
			deps.push(dep);
		}
	}
	if (deps.length === 0) return null;
	return {
		deps,
		...registryUrls.length && { registryUrls }
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map