import { logger } from "../../../logger/index.js";
import { Http } from "../../../util/http/index.js";
//#region lib/modules/manager/batect-wrapper/artifacts.ts
const http = new Http("batect-wrapper");
async function updateArtifact(path, fileName, version) {
	const url = `https://github.com/batect/batect/releases/download/${version}/${fileName}`;
	try {
		return { file: {
			type: "addition",
			path,
			contents: (await http.getText(url)).body
		} };
	} catch (err) {
		return { artifactError: {
			fileName: path,
			stderr: `HTTP GET ${url} failed: ${err.toString()}`
		} };
	}
}
async function updateArtifacts({ packageFileName, config }) {
	const version = config.newVersion;
	logger.debug(`Updating Batect wrapper scripts for ${packageFileName} to ${version}`);
	return [await updateArtifact(packageFileName, "batect", version), await updateArtifact(`${packageFileName}.cmd`, "batect.cmd", version)];
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map