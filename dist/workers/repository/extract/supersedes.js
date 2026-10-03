import { get } from "../../../modules/manager/index.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/workers/repository/extract/supersedes.ts
function processSupersedesManagers(extracts) {
	const rejected = {};
	for (const primaryExtract of extracts) {
		const primaryManager = primaryExtract.manager;
		const secondaryManagers = get(primaryExtract.manager, "supersedesManagers");
		if (!isNonEmptyArray(secondaryManagers)) continue;
		if (!primaryExtract.packageFiles) continue;
		const primaryPackageFiles = primaryExtract.packageFiles.map(({ packageFile }) => packageFile);
		for (const secondaryManager of secondaryManagers) {
			const secondaryExtract = extracts.find(({ manager }) => manager === secondaryManager);
			if (!secondaryExtract?.packageFiles) continue;
			for (const { packageFile, lockFiles } of secondaryExtract.packageFiles) {
				if (isNonEmptyArray(lockFiles)) {
					rejected[primaryManager] ??= [];
					rejected[primaryManager].push(packageFile);
					continue;
				}
				if (primaryPackageFiles.includes(packageFile)) {
					rejected[secondaryManager] ??= [];
					rejected[secondaryManager].push(packageFile);
				}
			}
		}
	}
	for (const extract of extracts) {
		const rejectedFiles = rejected[extract.manager];
		if (!isNonEmptyArray(rejectedFiles) || !extract.packageFiles) continue;
		extract.packageFiles = extract.packageFiles.filter(({ packageFile }) => !rejectedFiles.includes(packageFile));
	}
}
//#endregion
export { processSupersedesManagers };

//# sourceMappingURL=supersedes.js.map