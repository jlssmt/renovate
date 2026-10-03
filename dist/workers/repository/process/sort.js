import { logger } from "../../../logger/index.js";
//#region lib/workers/repository/process/sort.ts
function sortBranches(branches) {
	const sortOrder = [
		"pin",
		"digest",
		"patch",
		"minor",
		"major",
		"lockFileMaintenance"
	];
	logger.trace({ branches }, "branches");
	branches.sort((a, b) => {
		if (a.isVulnerabilityAlert && !b.isVulnerabilityAlert) return -1;
		if (!a.isVulnerabilityAlert && b.isVulnerabilityAlert) return 1;
		const prPriorityDiff = getPrPriority(b) - getPrPriority(a);
		if (prPriorityDiff !== 0) return prPriorityDiff;
		const sortDiff = sortOrder.indexOf(a.updateType) - sortOrder.indexOf(b.updateType);
		if (sortDiff !== 0) return sortDiff;
		return a.prTitle.localeCompare(b.prTitle, void 0, { numeric: true });
	});
}
function getPrPriority(branch) {
	return branch.prPriority ?? 0;
}
//#endregion
export { sortBranches };

//# sourceMappingURL=sort.js.map