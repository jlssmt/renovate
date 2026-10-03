import { logger } from "../../../logger/index.js";
//#region lib/modules/manager/git-submodules/artifacts.ts
function updateArtifacts({ updatedDeps }) {
	const res = [];
	updatedDeps.forEach((dep) => {
		logger.debug(`Updating submodule ${dep.depName}`);
		res.push({ file: {
			type: "addition",
			path: dep.depName,
			contents: ""
		} });
	});
	return res;
}
//#endregion
export { updateArtifacts as default };

//# sourceMappingURL=artifacts.js.map