import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { parseUrl } from "../../../util/url.js";
import { getOciChartDep } from "./oci.js";
import upath from "upath";
//#region lib/modules/manager/helmv3/utils.ts
function parseRepository(depName, repositoryURL, registryAliases) {
	const res = {};
	const url = parseUrl(repositoryURL);
	if (!url) {
		logger.debug({ repositoryURL }, "Error parsing url");
		res.skipReason = "invalid-url";
		return res;
	}
	switch (url.protocol) {
		case "oci:": return getOciChartDep(repositoryURL, depName, registryAliases);
		case "file:":
			res.skipReason = "local-dependency";
			break;
		default: res.registryUrls = [repositoryURL];
	}
	return res;
}
/**
* Resolves alias in repository string.
*
* @param repository to be resolved string
* @param registryAliases Records containing registryAliases as key and to be resolved URLs as values
*
* @returns  resolved alias. If repository does not contain an alias the repository string will be returned. Should it contain an alias which can not be resolved using `registryAliases`, null will be returned
*/
function resolveAlias(repository, registryAliases) {
	if (!isAlias(repository)) return repository;
	const alias = registryAliases[repository.slice(repository.startsWith("@") ? 1 : 6)];
	if (alias) return alias;
	return null;
}
function getRepositories(definitions) {
	const repositoryList = definitions.flatMap((value) => value.dependencies).filter((dependency) => dependency.repository).filter((dependency) => !isAlias(dependency.repository)).filter((dependency) => !dependency.repository.startsWith("file:")).map((dependency) => {
		return {
			name: dependency.name,
			repository: dependency.repository
		};
	});
	const dedup = /* @__PURE__ */ new Set();
	return repositoryList.filter((el) => {
		const duplicate = dedup.has(el.repository);
		dedup.add(el.repository);
		return !duplicate;
	});
}
/**
* Checks whether a chart reference points at a chart in the repository instead
* of a remote registry.
*
* @param path chart reference to check
*
* @returns `true` if the reference is a relative or absolute local path
*/
function isLocalChartPath(path) {
	return [
		"./",
		"../",
		"/"
	].some((localPrefix) => path.startsWith(localPrefix));
}
function isAlias(repository) {
	if (!repository) return false;
	return repository.startsWith("@") || repository.startsWith("alias:");
}
function aliasRecordToRepositories(registryAliases) {
	return Object.entries(registryAliases).filter(([, url]) => regEx(/^(?:https?|oci):\/\/.+/).exec(url)).map(([alias, url]) => {
		return {
			name: alias,
			repository: url
		};
	});
}
function isFileInDir(dir, file) {
	return upath.dirname(file) === dir;
}
//#endregion
export { aliasRecordToRepositories, getRepositories, isAlias, isFileInDir, isLocalChartPath, parseRepository, resolveAlias };

//# sourceMappingURL=utils.js.map