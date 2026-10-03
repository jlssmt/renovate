import { coerceArray } from "../array.js";
import { readLocalFile } from "../fs/index.js";
//#region lib/util/git/file-changes.ts
const defaultInclude = [
	"modified",
	"not_added",
	"deleted"
];
async function toAddition(path, additionMetadata) {
	return {
		type: "addition",
		path,
		contents: await readLocalFile(path),
		...await additionMetadata?.(path)
	};
}
/**
* Converts the result of `getRepoStatus()` into the {@link FileChange}s which
* managers return as artifact updates. The contents of every addition are read
* from the local directory.
*/
async function collectFileChanges(status, options = {}) {
	const { include = defaultInclude, filter, additionMetadata } = options;
	const changes = [];
	for (const bucket of include) {
		if (bucket === "renamed") {
			for (const { from, to } of coerceArray(status.renamed)) {
				if (!filter || filter(from)) changes.push({
					type: "deletion",
					path: from
				});
				if (!filter || filter(to)) changes.push(await toAddition(to, additionMetadata));
			}
			continue;
		}
		for (const path of coerceArray(status[bucket])) {
			if (filter && !filter(path)) continue;
			if (bucket === "deleted") changes.push({
				type: "deletion",
				path
			});
			else changes.push(await toAddition(path, additionMetadata));
		}
	}
	return changes;
}
//#endregion
export { collectFileChanges };

//# sourceMappingURL=file-changes.js.map