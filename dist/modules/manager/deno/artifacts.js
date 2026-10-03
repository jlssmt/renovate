import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { findAll } from "../../../util/host-rules.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { artifactError, artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { processHostRules } from "../npm/post-update/rules.js";
import { withNpmrcHostRules } from "../npm/utils.js";
import { isEmptyArray } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/deno/artifacts.ts
async function updateArtifacts(updateArtifact) {
	const { packageFileName, updatedDeps, newPackageFileContent, config } = updateArtifact;
	logger.debug(`deno.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (isEmptyArray(updatedDeps) && !isLockFileMaintenance) {
		logger.debug("No updated deno deps - returning null");
		return null;
	}
	const lockFileName = updatedDeps[0]?.lockFiles?.[0] ?? config.lockFiles?.[0];
	if (!lockFileName) {
		logger.debug("No lock file found. Skipping artifact update.");
		return null;
	}
	const oldLockFileContent = await readLocalFile(lockFileName);
	if (!oldLockFileContent) {
		logger.debug(`Failed to read ${lockFileName}. Skipping artifact update.`);
		return [artifactError(lockFileName, `Failed to read "${lockFileName}"`)];
	}
	for (const updateDep of updatedDeps) if (updateDep.depType === "tasks" || updateDep.depType === "tasks.command") {
		logger.warn({
			depType: updateDep.depType,
			depName: updateDep.depName,
			lockFileName
		}, "Dependency can't be updated with a lock file");
		return [artifactError(lockFileName, `depType: "${updateDep.depType}", depName: "${updateDep.depName}" can't be updated with a lock file: "${lockFileName}"`)];
	}
	const pkgFileDir = upath.dirname(packageFileName);
	const { additionalNpmrcContent } = processHostRules();
	try {
		return await withNpmrcHostRules(pkgFileDir, additionalNpmrcContent, async () => {
			const execOptions = {
				cwdFile: updatedDeps.find((dep) => dep.managerData?.importMapReferrer)?.managerData?.importMapReferrer ?? packageFileName,
				docker: {},
				toolConstraints: [{
					toolName: "deno",
					constraint: await resolveToolConstraint(config, "deno")
				}]
			};
			let command = "deno install --frozen=false";
			const defaultImportHosts = [
				"deno.land:443",
				"esm.sh:443",
				"jsr.io:443",
				"cdn.jsdelivr.net:443",
				"raw.githubusercontent.com:443",
				"gist.githubusercontent.com:443"
			];
			const additionalImportHosts = findAll({ hostType: "npm" }).filter((rule) => rule.resolvedHost).map((rule) => rule.resolvedHost);
			if (additionalImportHosts.length > 0) {
				const importHosts = [.../* @__PURE__ */ new Set([...defaultImportHosts, ...additionalImportHosts])].join(",");
				command += ` --allow-import=${quote(importHosts)}`;
			}
			return await updateLockFile({
				lockFileName,
				existingLockFileContent: oldLockFileContent,
				packageFile: {
					path: packageFileName,
					contents: newPackageFileContent
				},
				deleteLockFile: isLockFileMaintenance,
				run: () => exec(command, execOptions)
			});
		});
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.warn({
			lockfile: lockFileName,
			err
		}, `Failed to update lock file`);
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map