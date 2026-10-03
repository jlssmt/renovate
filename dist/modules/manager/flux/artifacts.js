import { logger } from "../../../logger/index.js";
import { readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { isSystemManifest } from "./common.js";
//#region lib/modules/manager/flux/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps }) {
	const systemDep = updatedDeps[0];
	if (!isSystemManifest(packageFileName) || !systemDep?.newVersion) return null;
	const existingFileContent = await readLocalFile(packageFileName, "utf8");
	try {
		logger.debug(`Updating Flux system manifests`);
		const args = ["--export"];
		if (systemDep.managerData?.components) args.push("--components", systemDep.managerData.components);
		const cmd = [{ command: [
			"flux",
			"install",
			...args
		] }];
		const execOptions = {
			docker: {},
			toolConstraints: [{
				toolName: "flux",
				constraint: updatedDeps[0].newVersion
			}]
		};
		const result = await exec(cmd, execOptions);
		if (!result.stdout) {
			logger.debug("Cannot read new flux file content");
			return [{ artifactError: {
				fileName: packageFileName,
				stderr: result.stderr
			} }];
		}
		await writeLocalFile(packageFileName, result.stdout);
		const newFileContent = result.stdout;
		if (newFileContent === existingFileContent) {
			logger.debug("Flux contents are unchanged");
			return null;
		}
		return [{ file: {
			type: "addition",
			path: packageFileName,
			contents: newFileContent
		} }];
	} catch (err) {
		logger.debug({ err }, "Error generating new Flux system manifests");
		return [{ artifactError: {
			fileName: packageFileName,
			stderr: err.message
		} }];
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map