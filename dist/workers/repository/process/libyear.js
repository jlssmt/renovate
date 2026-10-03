import { logger } from "../../../logger/index.js";
import { addLibYears } from "../../../instrumentation/reporting.js";
import { DateTime } from "luxon";
//#region lib/workers/repository/process/libyear.ts
function calculateLibYears(config, packageFiles) {
	if (!packageFiles) return;
	const allDeps = [];
	for (const [manager, files] of Object.entries(packageFiles)) for (const file of files) for (const dep of file.deps) {
		if (dep.enabled === false) continue;
		const depInfo = {
			depName: dep.depName,
			manager,
			file: file.packageFile,
			datasource: dep.datasource,
			version: dep.currentVersion ?? dep.currentValue
		};
		if (!dep.updates?.length) {
			allDeps.push(depInfo);
			continue;
		}
		depInfo.outdated = true;
		if (!dep.currentVersionTimestamp) {
			logger.once.debug(`LibYears: no currentVersionTimestamp for ${dep.depName}`);
			allDeps.push(depInfo);
			continue;
		}
		const currentVersionDate = DateTime.fromISO(dep.currentVersionTimestamp);
		for (const update of dep.updates) {
			if (!update.releaseTimestamp) {
				logger.once.debug(`LibYears: no releaseTimestamp for ${dep.depName} update to ${update.newVersion}`);
				continue;
			}
			const libYears = DateTime.fromISO(update.releaseTimestamp).diff(currentVersionDate, "years").years;
			if (libYears >= 0) update.libYears = libYears;
		}
		depInfo.libYear = Math.max(...dep.updates.map((update) => update.libYears ?? 0), 0);
		allDeps.push(depInfo);
	}
	const libYearsWithStatus = getLibYears(allDeps);
	logger.debug(libYearsWithStatus, "Repository libYears");
	addLibYears(config, libYearsWithStatus);
}
function getLibYears(allDeps) {
	const [totalDepsCount, outdatedDepsCount, totalLibYears] = getCounts(allDeps);
	return {
		libYears: {
			managers: getManagerLibYears(allDeps),
			total: totalLibYears
		},
		dependencyStatus: {
			outdated: outdatedDepsCount,
			total: totalDepsCount
		}
	};
}
function getManagerLibYears(deps) {
	/** {manager : {depKey: libYear }} */
	const managerLibYears = {};
	for (const dep of deps) {
		const depKey = `${dep.depName}@${dep.version}@${dep.datasource}`;
		const manager = dep.manager;
		managerLibYears[manager] ??= {};
		if (dep.libYear && !managerLibYears[manager][depKey]) managerLibYears[manager][depKey] = dep.libYear;
	}
	const res = {};
	for (const [manager, deps] of Object.entries(managerLibYears)) res[manager] = Object.values(deps).reduce((sum, curr) => {
		return sum + curr;
	}, 0);
	return res;
}
function getCounts(deps) {
	const distinctDeps = /* @__PURE__ */ new Set();
	let totalDepsCount = 0, outdatedDepsCount = 0, totalLibYears = 0;
	for (const dep of deps) {
		const depKey = `${dep.depName}@${dep.version}@${dep.datasource}`;
		if (!distinctDeps.has(depKey)) {
			if (dep.outdated) outdatedDepsCount++;
			if (dep.libYear) totalLibYears += dep.libYear;
			totalDepsCount++;
			distinctDeps.add(depKey);
		}
	}
	return [
		totalDepsCount,
		outdatedDepsCount,
		totalLibYears
	];
}
//#endregion
export { calculateLibYears };

//# sourceMappingURL=libyear.js.map