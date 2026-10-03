import { regEx } from "../../../../../../util/regex.js";
import { logger } from "../../../../../../logger/index.js";
//#region lib/modules/manager/npm/update/locked-dependency/yarn-lock/get-locked.ts
function parseEntry(depNameConstraint) {
	let entryName;
	let constraint;
	const split = depNameConstraint.split("@");
	if (split.length === 2) [entryName, constraint] = split;
	else if (split.length === 3) {
		entryName = `@${split[1]}`;
		constraint = split[2];
	} else {
		logger.debug({ depNameConstraint }, "Unexpected depNameConstraint");
		return null;
	}
	return {
		entryName,
		constraint
	};
}
function getYarn1LockedDependencies(yarnLock, depName, currentVersion) {
	const res = [];
	try {
		for (const [depNameConstraint, entry] of Object.entries(yarnLock)) {
			const parsed = parseEntry(depNameConstraint);
			/* v8 ignore next -- needs test */
			if (!parsed) continue;
			const { entryName, constraint } = parsed;
			if (entryName === depName && entry?.version === currentVersion) res.push({
				entry,
				depNameConstraint,
				depName,
				constraint
			});
		}
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "getLockedDependencies() error");
	}
	return res;
}
function getYarn2LockedDependencies(yarnLock, depName, currentVersion) {
	const res = [];
	try {
		for (const [fullConstraint, entry] of Object.entries(yarnLock)) {
			if (fullConstraint === "__metadata") continue;
			for (const subConstraint of fullConstraint.split(", ")) {
				const depNameConstraint = subConstraint;
				const parsed = parseEntry(depNameConstraint);
				/* v8 ignore next -- needs test */
				if (!parsed) continue;
				const { entryName } = parsed;
				const constraint = parsed.constraint.replace(regEx(/^npm:/), "");
				if (entryName === depName && entry?.version === currentVersion) res.push({
					entry,
					depNameConstraint,
					depName,
					constraint
				});
			}
		}
	} catch (err) /* v8 ignore next -- TODO: add test #40625 */ {
		logger.warn({ err }, "getLockedDependencies() error");
	}
	return res;
}
function getLockedDependencies(yarnLock, depName, currentVersion) {
	if ("__metadata" in yarnLock) return getYarn2LockedDependencies(yarnLock, depName, currentVersion);
	return getYarn1LockedDependencies(yarnLock, depName, currentVersion);
}
//#endregion
export { getLockedDependencies, getYarn1LockedDependencies, getYarn2LockedDependencies, parseEntry };

//# sourceMappingURL=get-locked.js.map