import { getLockedVersions } from "./locked-versions.js";
import { detectMonorepos } from "./monorepo.js";
//#region lib/modules/manager/npm/extract/post/index.ts
async function postExtract(packageFiles) {
	await detectMonorepos(packageFiles);
	await getLockedVersions(packageFiles);
}
//#endregion
export { postExtract };

//# sourceMappingURL=index.js.map