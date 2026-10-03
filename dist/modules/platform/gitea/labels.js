import { logger } from "../../../logger/index.js";
import { getOrgLabels, getRepoLabels } from "./gitea-helper.js";
//#region lib/modules/platform/gitea/labels.ts
async function fetchRepoLabels(http, repository) {
	const labels = await getRepoLabels(http, repository, { memCache: false });
	logger.debug(`Retrieved ${labels.length} repo labels`);
	return labels;
}
async function fetchOrgLabels(http, { isOrgRepo, orgName }) {
	if (!isOrgRepo) return [];
	try {
		const labels = await getOrgLabels(http, orgName, { memCache: false });
		logger.debug(`Retrieved ${labels.length} org labels`);
		return labels;
	} catch (err) {
		logger.debug({ err }, `Unable to fetch organization labels`);
		return [];
	}
}
/**
* Labels of the repository followed by the labels of its organization, if any.
*/
async function fetchLabelList(http, repo) {
	const [repoLabels, orgLabels] = await Promise.all([fetchRepoLabels(http, repo.repository), fetchOrgLabels(http, repo)]);
	return [...repoLabels, ...orgLabels];
}
/**
* Cached labels of the repository. The lookup is stored on the repository,
* so resetting `labelList` to `null` refetches the labels on next use.
*/
function getLabelList(http, repo) {
	repo.labelList ??= fetchLabelList(http, repo);
	return repo.labelList;
}
async function lookupLabelByName(http, repo, name) {
	logger.debug(`lookupLabelByName(${name})`);
	return (await getLabelList(http, repo)).find((l) => l.name === name)?.id ?? null;
}
//#endregion
export { getLabelList, lookupLabelByName };

//# sourceMappingURL=labels.js.map