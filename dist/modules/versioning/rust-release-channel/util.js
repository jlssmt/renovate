import { isObject } from "@sindresorhus/is";
//#region lib/modules/versioning/rust-release-channel/util.ts
/**
* Compare two parsed toolchain objects for sorting.
*
* @returns negative if a < b, positive if a > b, 0 if equal
*/
function sortParsed(parsedA, parsedB) {
	const channelA = parsedA.channel;
	const channelB = parsedB.channel;
	const isANightly = channelA === "nightly";
	const isBNightly = channelB === "nightly";
	if (isANightly && !isBNightly) return 1;
	if (!isANightly && isBNightly) return -1;
	if (isANightly && isBNightly && parsedA.date && parsedB.date) {
		const dateA = parsedA.date;
		const dateB = parsedB.date;
		if (dateA.year !== dateB.year) return dateA.year - dateB.year;
		if (dateA.month !== dateB.month) return dateA.month - dateB.month;
		if (dateA.day !== dateB.day) return dateA.day - dateB.day;
		return 0;
	}
	if (isObject(channelA) && isObject(channelB)) {
		if (channelA.major !== channelB.major) return channelA.major - channelB.major;
		if (channelA.minor !== channelB.minor) return channelA.minor - channelB.minor;
		const patchA = channelA.patch ?? 0;
		const patchB = channelB.patch ?? 0;
		if (patchA !== patchB) return patchA - patchB;
		const hasPreA = channelA.prerelease !== void 0;
		const hasPreB = channelB.prerelease !== void 0;
		if (hasPreA && !hasPreB) return -1;
		if (!hasPreA && hasPreB) return 1;
		if (hasPreA && hasPreB) {
			const numA = channelA.prerelease.number ?? 0;
			const numB = channelB.prerelease.number ?? 0;
			if (numA !== numB) return numA - numB;
		}
	}
	return 0;
}
//#endregion
export { sortParsed };

//# sourceMappingURL=util.js.map