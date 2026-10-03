//#region lib/workers/repository/onboarding/pr/base-branch.ts
function getBaseBranchDesc(config) {
	if (!config.baseBranchPatterns?.length) return "";
	if (config.baseBranchPatterns.length > 1) return `You have configured Renovate to use the following baseBranchPatterns: ${config.baseBranchPatterns.map((branch) => `\`${branch}\``).join(", ")}.`;
	return `You have configured Renovate to use branch \`${config.baseBranchPatterns[0]}\` as base branch.\n\n`;
}
//#endregion
export { getBaseBranchDesc };

//# sourceMappingURL=base-branch.js.map