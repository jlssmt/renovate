import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { getDep } from "../dockerfile/extract.js";
import { XPKG } from "./schema.js";
//#region lib/modules/manager/crossplane/extract.ts
function extractPackageFile(content, packageFile, extractConfig) {
	if (!regEx(/apiVersion:\s+["']?pkg\.crossplane\.io\/v.+["']?/).test(content)) {
		logger.trace({ packageFile }, "No Crossplane package found in file.");
		return null;
	}
	const list = parseYaml(content, {
		customSchema: XPKG,
		failureBehaviour: "filter"
	});
	const deps = [];
	for (const xpkg of list) {
		const dep = getDep(xpkg.spec.package, true, extractConfig?.registryAliases);
		dep.depType = xpkg.kind.toLowerCase();
		deps.push(dep);
	}
	return deps.length ? { deps } : null;
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map