import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { readLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { quote } from "shlex";
//#region lib/modules/manager/jsonnet-bundler/artifacts.ts
function dependencyUrl(dep) {
	const url = dep.packageName;
	if (dep.managerData?.subdir) return url.concat("/", dep.managerData.subdir);
	return url;
}
async function updateArtifacts(updateArtifact) {
	const { packageFileName, updatedDeps, config } = updateArtifact;
	logger.trace({ packageFileName }, "jsonnet-bundler.updateArtifacts()");
	const lockFileName = packageFileName.replace(regEx(/\.json$/), ".lock.json");
	if (!await readLocalFile(lockFileName, "utf8")) {
		logger.debug("No jsonnetfile.lock.json found");
		return null;
	}
	const execOptions = {
		cwdFile: packageFileName,
		docker: {},
		toolConstraints: [{
			toolName: "jb",
			constraint: await resolveToolConstraint(config, "jb")
		}]
	};
	try {
		if (config.isLockFileMaintenance) await exec("jb update", execOptions);
		else {
			const dependencyUrls = updatedDeps.map(dependencyUrl);
			if (dependencyUrls.length > 0) await exec(`jb update ${dependencyUrls.map(quote).join(" ")}`, execOptions);
		}
		const status = await getRepoStatus();
		if (status.isClean()) return null;
		return fileChangesToArtifactResults(await collectFileChanges(status));
	} catch (err) /* istanbul ignore next */ {
		if (err.message === "temporary-error") throw err;
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map