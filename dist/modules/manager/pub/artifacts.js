import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { parsePubspec, parsePubspecLock } from "./utils.js";
import { isEmptyArray, isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/pub/artifacts.ts
const SDK_NAMES = ["dart", "flutter"];
const PUB_GET_COMMAND = "pub get --no-precompile";
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`pub.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (isEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated pub deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "pubspec.lock");
	const oldLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!oldLockFileContent) {
		logger.debug("No pubspec.lock found");
		return null;
	}
	try {
		const isFlutter = newPackageFileContent.includes("sdk: flutter");
		const toolName = isFlutter ? "flutter" : "dart";
		const cmd = getExecCommand(toolName, updatedDeps, isLockFileMaintenance);
		const execOptions = {
			cwdFile: packageFileName,
			docker: {},
			toolConstraints: [{
				toolName,
				constraint: await resolveToolConstraint(config, toolName, () => {
					const pubspec = parsePubspec(packageFileName, newPackageFileContent);
					const pubspecToolName = isFlutter ? "flutter" : "sdk";
					const pubspecConstraint = pubspec?.environment[pubspecToolName];
					if (pubspecConstraint) return pubspecConstraint;
					return parsePubspecLock(lockFileName, oldLockFileContent)?.sdks[toolName];
				})
			}]
		};
		return await updateLockFile({
			lockFileName,
			existingLockFileContent: oldLockFileContent,
			packageFile: {
				path: packageFileName,
				contents: newPackageFileContent
			},
			run: () => exec(cmd, execOptions)
		});
	} catch (err) {
		/* v8 ignore if -- defensive rethrow, not reproduced in the pub specs */
		if (err.message === "temporary-error") throw err;
		logger.warn({
			lockfile: lockFileName,
			err
		}, `Failed to update lock file`);
		return artifactErrorResult(lockFileName, err);
	}
}
function getExecCommand(toolName, updatedDeps, isLockFileMaintenance) {
	if (isLockFileMaintenance) return `${toolName} pub upgrade`;
	const depNames = updatedDeps.map((dep) => dep.depName).filter(isString);
	if (depNames.length === 1 && SDK_NAMES.includes(depNames[0])) return `${toolName} ${PUB_GET_COMMAND}`;
	if (depNames.length === 2 && depNames.filter((depName) => SDK_NAMES.includes(depName)).length === 2) return `flutter ${PUB_GET_COMMAND}`;
	return `${toolName} pub upgrade ${depNames.filter((depName) => !SDK_NAMES.includes(depName)).map(quote).join(" ")}`;
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map