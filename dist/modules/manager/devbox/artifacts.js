import { logger } from "../../../logger/index.js";
import { getSiblingFileName, readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { isNonEmptyArray } from "@sindresorhus/is";
import { quote } from "shlex";
import semver from "semver";
//#region lib/modules/manager/devbox/artifacts.ts
async function updateArtifacts({ config, packageFileName, updatedDeps }) {
	const lockFileName = getSiblingFileName(packageFileName, "devbox.lock");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("No devbox.lock found");
		return null;
	}
	const nixConstraint = await resolveToolConstraint(config, "nix");
	const devboxConstraint = await resolveToolConstraint(config, "devbox");
	const supportsNoInstall = devboxConstraint ? semver.intersects(devboxConstraint, ">=0.14.0") : true;
	const execOptions = {
		cwdFile: packageFileName,
		toolConstraints: [{
			toolName: "nix",
			constraint: nixConstraint
		}, {
			toolName: "devbox",
			constraint: devboxConstraint
		}],
		docker: {}
	};
	const cmd = [];
	if (config.isLockFileMaintenance) cmd.push(supportsNoInstall ? "devbox update --no-install" : "devbox update");
	else if (isNonEmptyArray(updatedDeps)) {
		if (supportsNoInstall) {
			const updateCommands = updatedDeps.map((dep) => dep.depName && `devbox update ${quote(dep.depName)} --no-install`).filter((dep) => Boolean(dep));
			if (updateCommands.length) cmd.push(...updateCommands);
			else {
				logger.trace("No updated devbox packages - returning null");
				return null;
			}
		} else cmd.push("devbox install");
	} else {
		logger.trace("No updated devbox packages - returning null");
		return null;
	}
	const oldLockFileContent = await readLocalFile(lockFileName);
	if (!oldLockFileContent) {
		logger.trace(`No ${lockFileName} found`);
		return null;
	}
	try {
		return await updateLockFile({
			lockFileName,
			existingLockFileContent: oldLockFileContent,
			run: () => exec(cmd, execOptions)
		});
	} catch (err) {
		logger.warn({ err }, "Error updating devbox.lock");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map