import { newlineRegex, regEx } from "../../../util/regex.js";
import { TypstDatasource } from "../../datasource/typst/index.js";
import stripJsonComments from "strip-json-comments";
//#region lib/modules/manager/typst/extract.ts
function extractPackageFile(content) {
	const lines = stripJsonComments(content).split(newlineRegex);
	const deps = [];
	const importRegex = regEx(/#import\s+"@(?<namespace>[^/]+)\/(?<pkg>[^:]+):(?<version>[^"]+)"/g);
	for (const line of lines) for (const match of line.matchAll(importRegex)) {
		const { namespace, pkg, version } = match.groups;
		const dep = {
			datasource: TypstDatasource.id,
			packageName: `${namespace}/${pkg}`,
			currentValue: version
		};
		if (namespace === "preview") dep.depName = pkg;
		if (namespace !== "preview") dep.skipReason = namespace === "local" ? "local" : "unsupported";
		deps.push(dep);
	}
	return { deps };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map