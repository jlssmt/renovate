import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { coerceString } from "../../../util/string.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import upath from "upath";
//#region lib/modules/manager/jsonnet-bundler/extract.ts
function extractPackageFile(content, packageFile) {
	logger.trace({ packageFile }, "jsonnet-bundler.extractPackageFile()");
	if (packageFile.includes("vendor/")) return null;
	const deps = [];
	let jsonnetFile;
	try {
		jsonnetFile = JSON.parse(content);
	} catch {
		logger.debug({ packageFile }, `Invalid JSON`);
		return null;
	}
	for (const dependency of coerceArray(jsonnetFile.dependencies)) {
		const dep = extractDependency(dependency);
		if (dep) deps.push(dep);
	}
	if (!deps.length) return null;
	return { deps };
}
function extractDependency(dependency) {
	if (!dependency.source.git) return null;
	const gitRemote = parseUrl(dependency.source.git.remote);
	if (!gitRemote) {
		logger.debug({ dependency }, "Invalid Git remote URL");
		return null;
	}
	return {
		depName: upath.join(gitRemote.host, gitRemote.pathname.replace(regEx(/\.git$/), ""), coerceString(dependency.source.git.subdir)),
		packageName: dependency.source.git.remote,
		currentValue: dependency.version,
		managerData: { subdir: dependency.source.git.subdir }
	};
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map