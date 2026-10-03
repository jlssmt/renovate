import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { deleteLocalFile, getSiblingFileName, localPathExists } from "../../../util/fs/index.js";
import { exec } from "../../../util/exec/index.js";
import { getRepoStatus } from "../../../util/git/index.js";
import { DockerDatasource } from "../../datasource/docker/index.js";
import { HelmDatasource } from "../../datasource/helm/index.js";
import { collectFileChanges } from "../../../util/git/file-changes.js";
import { artifactError, artifactErrorResult, fileChangesToArtifactResults, resolveToolConstraint } from "../util.js";
import { parseKustomize } from "./extract.js";
import { generateHelmEnvs } from "../helmv3/common.js";
import { isNonEmptyString, isNullOrUndefined } from "@sindresorhus/is";
import { quote } from "shlex";
import upath from "upath";
//#region lib/modules/manager/kustomize/artifacts.ts
async function localExistingChartPath(chartHome, dependencyName, version) {
	const folderName = `${dependencyName}-${version}`;
	const path = upath.join(chartHome, folderName);
	return await localPathExists(path) ? path : null;
}
function helmRepositoryArgs(repository, depName, datasource) {
	switch (datasource) {
		case HelmDatasource.id: return `--repo ${quote(repository)} ${quote(depName)}`;
		case DockerDatasource.id: return quote(`oci://${repository}`);
		/* v8 ignore next: should never happen */
		default: throw new Error(`Unknown datasource: ${datasource}`);
	}
}
async function inflateHelmChart(flagEnabled, execOptions, chartHome, depName, repository, currentVersion, newVersion, datasource) {
	const currentChartExistingPath = await localExistingChartPath(chartHome, depName, currentVersion);
	if (!flagEnabled && isNullOrUndefined(currentChartExistingPath)) {
		logger.debug(`Not inflating Helm chart for ${depName} as kustomizeInflateHelmCharts is not enabled and the current version isn't inflated`);
		return;
	}
	if (isNonEmptyString(currentChartExistingPath) && isNonEmptyString(newVersion)) {
		logger.debug(`Deleting previous helm chart: ${currentChartExistingPath}`);
		await deleteLocalFile(currentChartExistingPath);
	}
	const versionToPull = newVersion ?? currentVersion;
	const versionToPullExistingPath = await localExistingChartPath(chartHome, depName, versionToPull);
	if (isNonEmptyString(versionToPullExistingPath)) {
		logger.debug(`Helm chart ${depName} version ${versionToPull} already exists at ${versionToPullExistingPath}`);
		return;
	}
	const folderName = `${depName}-${versionToPull}`;
	const untarDir = upath.join(chartHome, folderName);
	logger.debug(`Pulling helm chart ${depName} version ${versionToPull} to ${untarDir}`);
	const cmd = `helm pull --untar --untardir ${quote(untarDir)} --version ${quote(versionToPull)} ${helmRepositoryArgs(repository, depName, datasource)}`;
	await exec(cmd, execOptions);
}
async function updateArtifacts({ packageFileName, updatedDeps, newPackageFileContent, config }) {
	logger.debug(`kustomize.updateArtifacts(${packageFileName})`);
	const project = parseKustomize(newPackageFileContent);
	const isUpdateOptionInflateChartArchives = config.postUpdateOptions?.includes("kustomizeInflateHelmCharts") === true;
	if (isNullOrUndefined(project)) return [artifactError(void 0, "Failed to parse new package file content")];
	const chartHome = getSiblingFileName(packageFileName, project.helmGlobals?.chartHome ?? "charts");
	try {
		const helmConstraint = await resolveToolConstraint(config, "helm");
		const helmToolConstraint = {
			toolName: "helm",
			constraint: helmConstraint
		};
		const execOptions = {
			docker: {},
			extraEnv: generateHelmEnvs(helmConstraint),
			toolConstraints: [helmToolConstraint]
		};
		for (const dependency of updatedDeps) {
			if (!dependency.currentVersion) continue;
			if (dependency.newVersion === dependency.currentVersion) continue;
			if (!isNonEmptyString(dependency.depName)) continue;
			if (dependency.depType !== "HelmChart") continue;
			let repository = null;
			switch (dependency.datasource) {
				case HelmDatasource.id:
					repository = dependency.registryUrls?.[0];
					break;
				case DockerDatasource.id: repository = dependency.packageName;
			}
			if (isNullOrUndefined(repository)) continue;
			await inflateHelmChart(isUpdateOptionInflateChartArchives, execOptions, chartHome, dependency.depName, repository, dependency.currentVersion, dependency.newVersion, dependency.datasource);
		}
		const status = await getRepoStatus();
		const fileChanges = fileChangesToArtifactResults(await collectFileChanges(status, {
			include: ["not_added", "deleted"],
			filter: (file) => file.startsWith(chartHome)
		}));
		return fileChanges.length > 0 ? fileChanges : null;
	} catch (err) {
		if (err.message === "temporary-error") throw err;
		logger.debug({ err }, "Failed to inflate helm chart");
		return artifactErrorResult(void 0, err);
	}
}
//#endregion
export { updateArtifacts };

//# sourceMappingURL=artifacts.js.map