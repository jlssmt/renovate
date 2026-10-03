import { __exportAll } from "../../../_virtual/_rolldown/runtime.js";
//#region lib/modules/platform/local/index.ts
var local_exports = /* @__PURE__ */ __exportAll({
	addAssignees: () => addAssignees,
	addReviewers: () => addReviewers,
	createPr: () => createPr,
	deleteLabel: () => deleteLabel,
	ensureComment: () => ensureComment,
	ensureCommentRemoval: () => ensureCommentRemoval,
	ensureIssue: () => ensureIssue,
	ensureIssueClosing: () => ensureIssueClosing,
	experimental: () => true,
	findIssue: () => findIssue,
	findPr: () => findPr,
	getBranchPr: () => getBranchPr,
	getBranchStatus: () => getBranchStatus,
	getBranchStatusCheck: () => getBranchStatusCheck,
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
	setBranchStatus: () => setBranchStatus,
	updatePr: () => updatePr
});
const id = "local";
function initPlatform(params) {
	const dryRun = params.dryRun === "extract" ? "extract" : "lookup";
	return Promise.resolve({
		dryRun,
		endpoint: "local",
		persistRepoData: true,
		requireConfig: "optional"
	});
}
function getRepos() {
	return Promise.resolve([]);
}
function initRepo() {
	return Promise.resolve({
		defaultBranch: "",
		isFork: false,
		repoFingerprint: ""
	});
}
function findIssue() {
	return Promise.resolve(null);
}
function getIssueList() {
	return Promise.resolve([]);
}
function getRawFile() {
	return Promise.resolve(null);
}
function getJsonFile() {
	return Promise.resolve(null);
}
function getPrList() {
	return Promise.resolve([]);
}
function ensureIssueClosing() {
	return Promise.resolve();
}
function ensureIssue() {
	return Promise.resolve(null);
}
function massageMarkdown(input) {
	return input;
}
/**
* Unsed, no Dashboard
*/
function maxBodyLength() {
	return Infinity;
}
function updatePr() {
	return Promise.resolve();
}
function mergePr() {
	return Promise.resolve(false);
}
function addReviewers() {
	return Promise.resolve();
}
function addAssignees() {
	return Promise.resolve();
}
function createPr() {
	return Promise.resolve(null);
}
function deleteLabel() {
	return Promise.resolve();
}
function setBranchStatus() {
	return Promise.resolve();
}
function getBranchStatus() {
	return Promise.resolve("red");
}
function getBranchStatusCheck() {
	return Promise.resolve(null);
}
function ensureCommentRemoval() {
	return Promise.resolve();
}
function ensureComment() {
	return Promise.resolve(false);
}
function getPr() {
	return Promise.resolve(null);
}
function findPr() {
	return Promise.resolve(null);
}
function getBranchPr() {
	return Promise.resolve(null);
}
//#endregion
export { addAssignees, addReviewers, createPr, deleteLabel, ensureComment, ensureCommentRemoval, ensureIssue, ensureIssueClosing, findIssue, findPr, getBranchPr, getBranchStatus, getBranchStatusCheck, getIssueList, getJsonFile, getPr, getPrList, getRawFile, getRepos, id, initPlatform, initRepo, local_exports, massageMarkdown, maxBodyLength, mergePr, setBranchStatus, updatePr };

//# sourceMappingURL=index.js.map