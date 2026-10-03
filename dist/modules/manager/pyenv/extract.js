import { DockerDatasource } from "../../datasource/docker/index.js";
//#region lib/modules/manager/pyenv/extract.ts
function extractPackageFile(content) {
	return { deps: [{
		depName: "python",
		commitMessageTopic: "Python",
		currentValue: content.trim(),
		datasource: DockerDatasource.id
	}] };
}
//#endregion
export { extractPackageFile };

//# sourceMappingURL=extract.js.map