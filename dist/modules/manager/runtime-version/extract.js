import { regEx } from "../../../util/regex.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
//#region lib/modules/manager/runtime-version/extract.ts
const pythonRuntimeRegex = regEx("^python-(?<version>\\d+\\.\\d+\\.\\d+)$");
function extractPackageFile(content) {
	const runtimeVersion = pythonRuntimeRegex.exec(content)?.groups?.version;
	if (runtimeVersion) return { deps: [{
		depName: "python",
		currentValue: runtimeVersion,
		datasource: DockerDatasource.id
	}] };
	return null;
}
//#endregion
export { extractPackageFile, pythonRuntimeRegex };

//# sourceMappingURL=extract.js.map