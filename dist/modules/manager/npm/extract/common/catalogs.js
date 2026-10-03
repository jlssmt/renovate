import { extractDependency, parseDepName } from "./dependency.js";
//#region lib/modules/manager/npm/extract/common/catalogs.ts
const PNPM_CATALOG_DEPENDENCY = "pnpm.catalog";
const YARN_CATALOG_DEPENDENCY = "yarn.catalog";
/**
* In order to facilitate matching on specific catalogs, we structure the
* depType as `[pnpm|yarn].catalog.default`, `[pnpm|yarn].catalog.react17`, and so on.
*/
function getCatalogDepType(name, npmManager) {
	return `${npmManager === "pnpm" ? PNPM_CATALOG_DEPENDENCY : YARN_CATALOG_DEPENDENCY}.${name}`;
}
function extractCatalogDeps(catalogs, npmManager = "pnpm") {
	const deps = [];
	for (const catalog of catalogs) for (const [key, val] of Object.entries(catalog.dependencies)) {
		const depType = getCatalogDepType(catalog.name, npmManager);
		const depName = parseDepName(depType, key);
		const dep = {
			depType,
			depName,
			...extractDependency(depType, depName, val),
			prettyDepType: depType
		};
		deps.push(dep);
	}
	return deps;
}
//#endregion
export { PNPM_CATALOG_DEPENDENCY, YARN_CATALOG_DEPENDENCY, extractCatalogDeps };

//# sourceMappingURL=catalogs.js.map