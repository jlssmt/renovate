import { logger } from "../../../logger/index.js";
import { getMatchingFiles, resolveRelativePathToRoot } from "../../../util/fs/util.js";
import { readFileAsXmlDocument } from "./util.js";
import { scm } from "../../platform/scm.js";
import { isNonEmptyString } from "@sindresorhus/is";
import upath from "upath";
import { Graph, hasCycle } from "graph-data-structure";
//#region lib/modules/manager/nuget/package-tree.ts
const GLOBAL_JSON = "global.json";
const NUGET_CENTRAL_FILE = "Directory.Packages.props";
const MSBUILD_CENTRAL_FILE = "Packages.props";
const DIRECTORY_BUILD_PROPS = "Directory.Build.props";
/**
* Get all leaf package files of ancestry that depend on packageFileName.
*/
async function getDependentPackageFiles(packageFileName, isPropsFile = false, isGlobalJson = false) {
	const packageFiles = await getAllPackageFiles();
	const graph = new Graph();
	if (isPropsFile) graph.addNode(packageFileName);
	if (isGlobalJson) graph.addNode(GLOBAL_JSON);
	const parentDir = packageFileName === "Directory.Packages.props" || packageFileName === "Packages.props" || packageFileName === "global.json" || packageFileName === "Directory.Build.props" ? "" : upath.dirname(packageFileName);
	for (const f of packageFiles) {
		graph.addNode(f);
		if ((isPropsFile || isGlobalJson) && upath.dirname(f).startsWith(parentDir)) graph.addEdge(packageFileName, f);
	}
	for (const f of packageFiles) {
		const doc = await readFileAsXmlDocument(f);
		if (!doc) continue;
		const normalizedRelativeProjectReferences = doc.childrenNamed("ItemGroup").map((ig) => ig.childrenNamed("ProjectReference")).flat().map((pf) => pf.attr.Include).filter(isNonEmptyString).map((a) => upath.normalize(a)).map((r) => resolveRelativePathToRoot(f, r));
		for (const ref of normalizedRelativeProjectReferences) graph.addEdge(ref, f);
		if (hasCycle(graph)) throw new Error("Circular reference detected in NuGet package files");
	}
	const deps = /* @__PURE__ */ new Map();
	recursivelyGetDependentPackageFiles(packageFileName, graph, deps);
	if (isPropsFile || isGlobalJson) deps.delete(packageFileName);
	return Array.from(deps).map(([name, isLeaf]) => ({
		name,
		isLeaf
	}));
}
/**
* Traverse graph and find dependent package files at any level of ancestry
*/
function recursivelyGetDependentPackageFiles(packageFileName, graph, deps) {
	if (deps.has(packageFileName)) return;
	const dependents = graph.adjacent(packageFileName);
	if (!dependents || dependents.size === 0) {
		deps.set(packageFileName, true);
		return;
	}
	deps.set(packageFileName, false);
	for (const dep of dependents) recursivelyGetDependentPackageFiles(dep, graph, deps);
}
/**
* Get a list of package files in localDir
*/
async function getAllPackageFiles() {
	const allFiles = await scm.getFileList();
	const filteredPackageFiles = getMatchingFiles("**/*.{cs,vb,fs}proj", allFiles);
	logger.trace({ filteredPackageFiles }, "Found package files");
	return filteredPackageFiles;
}
//#endregion
export { DIRECTORY_BUILD_PROPS, GLOBAL_JSON, MSBUILD_CENTRAL_FILE, NUGET_CENTRAL_FILE, getDependentPackageFiles };

//# sourceMappingURL=package-tree.js.map