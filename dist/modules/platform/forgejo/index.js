import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
import { logger } from "../../../logger/index.js";
import { ForgejoHttp, setBaseUrl } from "../../../util/http/forgejo.js";
import { createPlatform } from "../gitea/index.js";
import semver from "semver";
//#region lib/modules/platform/forgejo/index.ts
var forgejo_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	findIssue: () => findIssue,
	findPr: () => findPr,
	forgejoHttp: () => forgejoHttp,
	getBranchPr: () => getBranchPr,
	getBranchStatus: () => getBranchStatus,
	getBranchStatusCheck: () => getBranchStatusCheck,
	getIssue: () => getIssue,
	getIssueList: () => getIssueList,
	getJsonFile: () => getJsonFile,
	getPr: () => getPr,
	getPrList: () => getPrList,
	getRawFile: () => getRawFile,
	getRepos: () => getRepos,
	id: () => id,
	initPlatform: () => initPlatform,
	initRepo: () => initRepo,
	massageMarkdown: () => massageMarkdown,
	maxBodyLength: () => maxBodyLength,
	mergePr: () => mergePr,
	resetPlatform: () => resetPlatform,
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
const id = "forgejo";
const forgejoHttp = new ForgejoHttp();
function logDetectedVersion(version) {
	logger.debug(`Forgejo version: ${version}`);
}
function checkNativeAutomerge(version) {
	if (semver.gte(version, "10.0.0-0")) return null;
	return `Forgejo-native automerge: not supported on this version of Forgejo. Use 10.0.0 or newer.`;
}
const { platform, resetPlatform } = createPlatform({
	id,
	defaultEndpoint: "https://code.forgejo.org/",
	http: forgejoHttp,
	setBaseUrl,
	logDetectedVersion,
	checkNativeAutomerge
});
const { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getRawFile, getJsonFile, getIssueList, getPr, massageMarkdown, maxBodyLength, getPrList, getRepos, initPlatform, initRepo, mergePr, setBranchStatus, updatePr } = platform;
//#endregion
export { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, forgejoHttp, forgejo_exports, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssue, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, massageMarkdown, maxBodyLength, mergePr, resetPlatform, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map