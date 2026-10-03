//#region lib/modules/manager/npm/extract/common/node.ts
function setNodeCommitTopic(dep) {
	if (dep.depName === "node") dep.commitMessageTopic = "Node.js";
}
//#endregion
export { setNodeCommitTopic };

//# sourceMappingURL=node.js.map