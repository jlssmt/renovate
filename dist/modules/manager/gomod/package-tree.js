import { regEx } from "../../../util/regex.js";
import { getMatchingFiles, resolveRelativePathToRoot } from "../../../util/fs/util.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { scm } from "../../platform/scm.js";
import upath from "upath";
import { Graph, depthFirstSearch, topologicalSort } from "graph-data-structure";
//#region lib/modules/manager/gomod/package-tree.ts
const localReplace = regEx(/^[^\S\n]*(?:replace[^\S\n]+)?[^\s/]\S*(?:[^\S\n]+\S+)?[^\S\n]+=>[^\S\n]+(?<localPath>\.{1,2}\/\S*)/gm);
/**
* Get the target paths of all `replace` directives which point to a local directory.
*/
function parseLocalReplacePaths(content) {
	return Array.from(content.matchAll(localReplace), (match) => match.groups.localPath);
}
/**
* Build a graph of all `go.mod` files based on their local `replace` directives.
* Edges point from a module to the modules which depend on it, so
* `graph.adjacent(x)` returns the dependents of `x`.
*/
async function buildDependencyGraph() {
	const graph = new Graph();
	const goModFiles = getMatchingFiles("**/go.mod", await scm.getFileList());
	const known = new Set(goModFiles);
	for (const f of goModFiles) graph.addNode(f);
	for (const f of goModFiles) {
		const content = await readLocalFile(f, "utf8");
		if (!content) continue;
		for (const localPath of parseLocalReplacePaths(content)) {
			const dependency = upath.join(resolveRelativePathToRoot(f, localPath), "go.mod");
			if (known.has(dependency)) graph.addEdge(dependency, f);
		}
	}
	return graph;
}
/**
* Get all `go.mod` files which transitively depend on `packageFileName`, ordered
* so that a module always comes before the modules which depend on it.
* The given `packageFileName` is not included.
*/
async function getGoModulesInTidyOrder(packageFileName) {
	const graph = await buildDependencyGraph();
	if (!graph.adjacent(packageFileName)) return [];
	const dependents = new Set(depthFirstSearch(graph, {
		sourceNodes: [packageFileName],
		includeSourceNodes: false
	}));
	return topologicalSort(graph).filter((f) => dependents.has(f));
}
//#endregion
export { getGoModulesInTidyOrder, parseLocalReplacePaths };

//# sourceMappingURL=package-tree.js.map