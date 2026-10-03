import { extractDependency } from "./dependency.js";
import { setNodeCommitTopic } from "./node.js";
import { isEmptyObject, isString } from "@sindresorhus/is";
//#region lib/modules/manager/npm/extract/common/overrides.ts
/**
* Used when there is a json object as a value in overrides block.
* @param parents
* @param child
* @returns PackageDependency array
*/
function extractOverrideDepsRec(parents, child) {
	const deps = [];
	if (!child || isEmptyObject(child)) return deps;
	for (const [overrideName, versionValue] of Object.entries(child)) if (isString(versionValue)) {
		const currDepName = overrideName === "." ? parents.at(-1) : overrideName;
		const dep = {
			depName: currDepName,
			depType: "overrides",
			managerData: { parents: parents.slice() }
		};
		setNodeCommitTopic(dep);
		deps.push({
			...dep,
			...extractDependency("overrides", currDepName, versionValue)
		});
	} else {
		parents.push(overrideName);
		const depsOfObject = extractOverrideDepsRec(parents, versionValue);
		deps.push(...depsOfObject);
	}
	parents.pop();
	return deps;
}
//#endregion
export { extractOverrideDepsRec };

//# sourceMappingURL=overrides.js.map