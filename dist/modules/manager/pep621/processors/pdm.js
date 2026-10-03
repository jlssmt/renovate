import "../../../../constants/error-messages.js";
import { logger } from "../../../../logger/index.js";
import { getSiblingFileName, readLocalFile } from "../../../../util/fs/index.js";
import { Result } from "../../../../util/result.js";
import { PypiDatasource } from "../../../datasource/pypi/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../../util.js";
import { withGitEnvironment } from "../../../../util/git/exec.js";
import { BasePyProjectProcessor } from "./abstract.js";
import { depTypes } from "../utils.js";
import { PdmLockfile } from "../schema.js";
import { quote } from "shlex";
//#region lib/modules/manager/pep621/processors/pdm.ts
const pdmUpdateCMD = "pdm update --no-sync --update-eager";
const gitExec = withGitEnvironment(["pep621"]);
var PdmProcessor = class extends BasePyProjectProcessor {
	lockfileName = "pdm.lock";
	process(project, deps) {
		const devDependencies = project.tool?.pdm?.devDependencies;
		if (devDependencies) deps.push(...devDependencies);
		const registryUrls = project.tool?.pdm?.registryUrls;
		if (registryUrls) {
			for (const dep of deps) if (dep.datasource === PypiDatasource.id) dep.registryUrls = registryUrls;
		}
		return deps;
	}
	async extractLockedVersions(project, deps, packageFile) {
		if (!project.tool?.pdm && project["build-system"]?.["build-backend"] !== "pdm.backend") return Promise.resolve(deps);
		const lockFileName = getSiblingFileName(packageFile, "pdm.lock");
		const lockFileContent = await readLocalFile(lockFileName, "utf8");
		if (lockFileContent) {
			const lockFileMapping = Result.parse(lockFileContent, PdmLockfile.transform(({ lock }) => lock)).unwrapOr({});
			for (const dep of deps) {
				const packageName = dep.packageName;
				if (packageName && packageName in lockFileMapping) dep.lockedVersion = lockFileMapping[packageName];
			}
		}
		return Promise.resolve(deps);
	}
	async updateArtifacts(updateArtifact, project) {
		const { config, updatedDeps, packageFileName } = updateArtifact;
		const { isLockFileMaintenance } = config;
		const lockFileName = getSiblingFileName(packageFileName, this.lockfileName);
		try {
			const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
			if (!existingLockFileContent) {
				logger.debug("No pdm.lock found");
				return null;
			}
			const execOptions = {
				cwdFile: packageFileName,
				docker: {},
				toolConstraints: [{
					toolName: "python",
					constraint: await resolveToolConstraint(config, "python", () => project.project?.["requires-python"])
				}, {
					toolName: "pdm",
					constraint: await resolveToolConstraint(config, "pdm")
				}]
			};
			const cmds = [];
			if (isLockFileMaintenance) cmds.push(pdmUpdateCMD);
			else cmds.push(...generateCMDs(updatedDeps));
			return await updateLockFile({
				lockFileName,
				existingLockFileContent,
				run: () => gitExec(cmds, execOptions)
			});
		} catch (err) {
			if (err.message === "temporary-error") throw err;
			logger.debug({ err }, "Failed to update PDM lock file");
			return artifactErrorResult(lockFileName, err);
		}
	}
};
function generateCMDs(updatedDeps) {
	const cmds = [];
	const packagesByCMD = {};
	for (const dep of updatedDeps) switch (dep.depType) {
		case depTypes.optionalDependencies:
			if (!dep.managerData?.depGroup) {
				logger.once.warn({ dep: dep.depName }, "Unexpected optional dependency without group");
				continue;
			}
			addPackageToCMDRecord(packagesByCMD, `${pdmUpdateCMD} -G ${quote(dep.managerData.depGroup)}`, dep.packageName);
			break;
		case depTypes.dependencyGroups:
		case depTypes.pdmDevDependencies:
			if (!dep.managerData?.depGroup) {
				logger.once.warn({ dep: dep.depName }, "Unexpected dev dependency without group");
				continue;
			}
			addPackageToCMDRecord(packagesByCMD, `${pdmUpdateCMD} -dG ${quote(dep.managerData.depGroup)}`, dep.packageName);
			break;
		case depTypes.buildSystemRequires: break;
		default: addPackageToCMDRecord(packagesByCMD, pdmUpdateCMD, dep.packageName);
	}
	for (const commandPrefix in packagesByCMD) {
		const cmd = `${commandPrefix} ${packagesByCMD[commandPrefix].map(quote).join(" ")}`;
		cmds.push(cmd);
	}
	return cmds;
}
function addPackageToCMDRecord(packagesByCMD, commandPrefix, packageName) {
	if (!packagesByCMD[commandPrefix]) packagesByCMD[commandPrefix] = [];
	packagesByCMD[commandPrefix].push(packageName);
}
//#endregion
export { PdmProcessor };

//# sourceMappingURL=pdm.js.map