import { logger } from "../../../logger/index.js";
import upath from "upath";
import { Graph, topologicalSort } from "graph-data-structure";
//#region lib/modules/manager/pip-compile/utils.ts
function sortPackageFiles(depsBetweenFiles, packageFiles) {
	const result = [];
	const graph = new Graph();
	depsBetweenFiles.forEach(({ sourceFile, outputFile }) => {
		graph.addEdge(sourceFile, outputFile);
	});
	const sorted = topologicalSort(graph);
	for (const file of sorted) if (packageFiles.has(file)) {
		const packageFile = packageFiles.get(file);
		const sortedLockFiles = [];
		for (const lockFile of packageFile.lockFiles)
 // v8 ignore else -- every lock file of a package file is in the sorted list
		if (sorted.includes(lockFile)) sortedLockFiles.push(lockFile);
		packageFile.lockFiles = sortedLockFiles;
		result.push(packageFile);
	}
	// istanbul ignore if: should never happen
	if (result.length !== packageFiles.size) throw new Error("Topological sort failed to include all package files");
	return result;
}
function generateMermaidGraph(depsBetweenFiles, lockFileArgs) {
	const lockFiles = [];
	for (const lockFile of lockFileArgs.keys()) lockFiles.push(`  ${lockFile}[[${lockFile}]]`);
	const edges = depsBetweenFiles.map(({ sourceFile, outputFile, type }) => {
		return `  ${sourceFile} -${type === "requirement" ? "" : "."}-> ${outputFile}`;
	});
	return `graph TD\n${lockFiles.join("\n")}\n${edges.join("\n")}`;
}
function inferCommandExecDir(outputFilePath, outputFileArg) {
	if (!outputFileArg) return upath.normalize(upath.dirname(outputFilePath));
	if (upath.normalize(outputFileArg).startsWith("..")) throw new Error(`Cannot infer command execution directory from path ${outputFileArg}`);
	if (upath.basename(outputFileArg) !== upath.basename(outputFilePath)) throw new Error(`Output file name mismatch: ${upath.basename(outputFileArg)} vs ${upath.basename(outputFilePath)}`);
	const outputFileDir = upath.normalize(upath.dirname(outputFileArg));
	let commandExecDir = upath.normalize(upath.dirname(outputFilePath));
	for (const dir of outputFileDir.split("/").reverse()) if (commandExecDir.endsWith(dir)) commandExecDir = upath.join(commandExecDir.slice(0, -dir.length), ".");
	else break;
	commandExecDir = upath.normalizeTrim(commandExecDir);
	if (commandExecDir !== ".") logger.debug({
		commandExecDir,
		outputFileArg,
		outputFilePath
	}, `pip-compile: command was not executed in repository root`);
	return commandExecDir;
}
//#endregion
export { generateMermaidGraph, inferCommandExecDir, sortPackageFiles };

//# sourceMappingURL=utils.js.map