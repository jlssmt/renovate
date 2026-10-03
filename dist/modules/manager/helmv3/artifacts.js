import "../../../constants/error-messages.js";
import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { find } from "../../../util/host-rules.js";
import { parseSingleYaml } from "../../../util/yaml.js";
import { getParentDir, getSiblingFileName, readLocalFile, writeLocalFile } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactErrorResult, fileAddition, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { isOCIRegistry } from "./oci.js";
import { aliasRecordToRepositories, getRepositories, isFileInDir } from "./utils.js";
import { generateHelmEnvs, generateRegistryLoginCmd } from "./common.js";
import { isString, isTruthy } from "@sindresorhus/is";
import { quote } from "shlex";
import pMap from "p-map";
//#region lib/modules/manager/helmv3/artifacts.ts
async function helmCommands(execOptions, manifestPath, repositories) {
	const cmd = [];
	const ociRepositories = repositories.filter(isOCIRegistry);
	await pMap(ociRepositories, async (value) => {
		const loginCmd = await generateRegistryLoginCmd(value.name, value.repository);
		if (loginCmd) cmd.push(loginCmd);
	});
	repositories.filter((repository) => !isOCIRegistry(repository)).map((value) => {
		return {
			...value,
			hostRule: find({
				url: value.repository,
				hostType: HelmDatasource.id
			})
		};
	}).forEach((value) => {
		const { username, password } = value.hostRule;
		const parameters = [`${quote(value.repository)}`, `--force-update`];
		if (username && password) {
			parameters.push(`--username ${quote(username)}`);
			parameters.push(`--password ${quote(password)}`);
		}
		cmd.push(`helm repo add ${quote(value.name)} ${parameters.join(" ")}`);
	});
	cmd.push(`helm dependency update ${quote(getParentDir(manifestPath))}`);
	await exec(cmd, execOptions);
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`helmv3.updateArtifacts(${packageFileName})`);
	const { isLockFileMaintenance } = config;
	const isUpdateOptionAddChartArchives = config.postUpdateOptions?.includes("helmUpdateSubChartArchives");
	if (!isLockFileMaintenance && (updatedDeps === void 0 || updatedDeps.length < 1)) {
		logger.debug("No updated helmv3 deps - returning null");
		return null;
	}
	const lockFileName = getSiblingFileName(packageFileName, "Chart.lock");
	const existingLockFileContent = await readLocalFile(lockFileName, "utf8");
	if (!existingLockFileContent && !isUpdateOptionAddChartArchives) {
		logger.debug("No Chart.lock found");
		return null;
	}
	try {
		const packages = parseSingleYaml(newPackageFileContent);
		const locks = existingLockFileContent ? parseSingleYaml(existingLockFileContent) : { dependencies: [] };
		const chartDefinitions = [];
		if (config.registryAliases) chartDefinitions.push({ dependencies: aliasRecordToRepositories(config.registryAliases) });
		chartDefinitions.push(packages, locks);
		const repositories = getRepositories(chartDefinitions);
		await writeLocalFile(packageFileName, newPackageFileContent);
		logger.debug("Updating Helm artifacts");
		const helmConstraint = await resolveToolConstraint(config, "helm");
		const helmToolConstraint = {
			toolName: "helm",
			constraint: helmConstraint
		};
		await helmCommands({
			docker: {},
			extraEnv: generateHelmEnvs(helmConstraint),
			toolConstraints: [helmToolConstraint]
		}, packageFileName, repositories);
		logger.debug("Returning updated Helm artifacts");
		const fileChanges = [];
		if (isTruthy(existingLockFileContent)) {
			const newHelmLockContent = await readLocalFile(lockFileName, "utf8");
			if (!isString(newHelmLockContent) || isHelmLockChanged(existingLockFileContent, newHelmLockContent)) fileChanges.push(fileAddition(lockFileName, newHelmLockContent));
			else logger.debug("Chart.lock is unchanged");
		}
		if (isTruthy(isUpdateOptionAddChartArchives)) {
			const chartsPath = getSiblingFileName(packageFileName, "charts");
			const status = await getRepoStatus();
			fileChanges.push(...fileChangesToArtifactResults(await collectFileChanges(status, {
				include: ["not_added", "deleted"],
				filter: (file) => isFileInDir(chartsPath, file)
			})));
		}
		return fileChanges.length > 0 ? fileChanges : null;
	} catch (err) {
		// istanbul ignore if
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to update Helm lock file");
		return artifactErrorResult(lockFileName, err);
	}
}
function isHelmLockChanged(oldContent, newContent) {
	const regex = regEx(/^generated: ".+"$/m);
	return newContent.replace(regex, "") !== oldContent.replace(regex, "");
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map