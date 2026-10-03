import { logger } from "../../../logger/index.js";
import { gitlabApi } from "./http.js";
//#region lib/modules/platform/gitlab/merge-request.ts
async function getMR(repository, iid) {
	logger.debug(`getMR(${iid})`);
	const url = `projects/${repository}/merge_requests/${iid}?include_diverged_commits_count=1`;
	return (await gitlabApi.getJsonUnchecked(url)).body;
}
async function updateMR(repository, iid, data) {
	logger.debug(`updateMR(${iid})`);
	const url = `projects/${repository}/merge_requests/${iid}`;
	await gitlabApi.putJson(url, { body: data });
}
//#endregion
export { getMR, updateMR };

//# sourceMappingURL=merge-request.js.map