import "../../../constants/error-messages.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { parseYaml } from "../../../util/yaml.js";
import { getSiblingFileName } from "../../../util/fs/index.js";
import { Result } from "../../../util/result.js";
import { exec } from "../../../util/exec/index.js";
import { getFile } from "../../../util/git/index.js";
import { artifactErrorResult, resolveToolConstraint, updateLockFile } from "../util.js";
import { generateHelmEnvs, generateRegistryLoginCmd } from "../helmv3/common.js";
import { Doc, LockVersion } from "./schema.js";
import { isOciRepositoryFlagSet } from "./utils.js";
import { isFalsy } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/modules/manager/helmfile/artifacts.ts
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.trace(`helmfile.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	if (!isLockFileMaintenance && (updatedDeps === void 0 || updatedDeps.length < 1)) {
		logger.debug("No updated helmfile deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "helmfile.lock");
	const existingLockFileContent = await getFile(lockFileName);
	if (isFalsy(existingLockFileContent)) {
		logger.debug("No helmfile.lock found");
		return null;
	}
	try {
		const helmConstraint = await resolveToolConstraint(config, "helm");
		const toolConstraints = [{
			toolName: "helm",
			constraint: helmConstraint
		}, {
			toolName: "helmfile",
			constraint: await resolveToolConstraint(config, "helmfile", () => Result.parse(existingLockFileContent, LockVersion).unwrapOrNull())
		}];
		if (updatedDeps.some((dep) => dep.managerData?.needKustomize)) toolConstraints.push({
			toolName: "kustomize",
			constraint: await resolveToolConstraint(config, "kustomize")
		});
		const cmd = [];
		const docs = parseYaml(newPackageFileContent, {
			removeTemplates: true,
			customSchema: Doc,
			failureBehaviour: "filter"
		});
		for (const doc of docs) for (const value of coerceArray(doc.repositories).filter(isOciRepositoryFlagSet)) {
			const loginCmd = await generateRegistryLoginCmd(value.name, value.url);
			// v8 ignore else -- needs a repository the login helper cannot handle
			if (loginCmd) cmd.push(loginCmd);
		}
		cmd.push(`helmfile deps -f ${quote(packageFileName)}`);
		return await updateLockFile({
			lockFileName,
			existingLockFileContent,
			packageFile: {
				path: packageFileName,
				contents: newPackageFileContent
			},
			run: () => exec(cmd, {
				docker: {},
				extraEnv: generateHelmEnvs(helmConstraint),
				toolConstraints
			})
		});
	} catch (err) {
		/* v8 ignore if -- defensive rethrow, not reproduced in the helmfile specs */
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to update Helmfile lock file");
		return artifactErrorResult(lockFileName, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map