import { logger } from "../../../logger/index.js";
import { coreApi, policyApi } from "./azure-got-wrapper.js";
import "./schema.js";
import "./util.js";
import { GitPullRequestMergeStrategy } from "azure-devops-node-api/interfaces/GitInterfaces.js";
//#region lib/modules/platform/azure/azure-helper.ts
const mergePolicyGuid = "fa4e907d-c16b-4a4c-9dfa-4916e5d171ab";
const policyKeyByStrategy = {
	[GitPullRequestMergeStrategy.NoFastForward]: "allowNoFastForward",
	[GitPullRequestMergeStrategy.Squash]: "allowSquash",
	[GitPullRequestMergeStrategy.Rebase]: "allowRebase",
	[GitPullRequestMergeStrategy.RebaseMerge]: "allowRebaseMerge"
};
async function getMergeMethod(repoId, project, branchRef, defaultBranch) {
	logger.debug(`getMergeMethod(branchRef=${branchRef}, defaultBranch=${defaultBranch})`);
	function isRelevantScope(scope) {
		if (scope.matchKind === "DefaultBranch" && (!branchRef || branchRef === `refs/heads/${defaultBranch}`)) return true;
		if (scope.repositoryId !== repoId && scope.repositoryId !== null) return false;
		if (!branchRef) return true;
		return scope.matchKind === "Exact" ? scope.refName === branchRef : branchRef.startsWith(scope.refName);
	}
	const policyConfigurations = (await (await policyApi()).getPolicyConfigurations(project, void 0, mergePolicyGuid)).filter((p) => p.settings.scope.some(isRelevantScope)).map((p) => p.settings)[0];
	logger.debug({ policyConfigurations }, `getMergeMethod(branchRef=${branchRef}) determining mergeMethod from matched policy`);
	for (const [key, policyKey] of Object.entries(policyKeyByStrategy)) if (policyConfigurations?.[policyKey] === true) {
		const method = parseInt(key, 10);
		logger.debug({ policyConfigurations }, `getMergeMethod(branchRef=${branchRef})=${GitPullRequestMergeStrategy[method]}`);
		return method;
	}
	logger.debug({ policyConfigurations }, `getMergeMethod(branchRef=${branchRef})=${GitPullRequestMergeStrategy[GitPullRequestMergeStrategy.NoFastForward]}`);
	return GitPullRequestMergeStrategy.NoFastForward;
}
async function getPolicyEvaluations(project, artifactId) {
	logger.debug(`getPolicyEvaluations(${project}, ${artifactId})`);
	return await (await policyApi()).getPolicyEvaluations(project, artifactId);
}
async function getAllProjectTeams(projectId) {
	const allTeams = [];
	const azureApiCore = await coreApi();
	const top = 100;
	let skip = 0;
	let length = 0;
	do {
		const teams = await azureApiCore.getTeams(projectId, void 0, top, skip);
		length = teams.length;
		allTeams.push(...teams);
		skip += top;
	} while (top <= length);
	return allTeams;
}
//#endregion
export { getAllProjectTeams, getMergeMethod, getPolicyEvaluations };

//# sourceMappingURL=azure-helper.js.map