import { compare as compare$1 } from "../nuget/version.js";
//#region lib/modules/versioning/paket/version.ts
function sameReleaseParts(x, y) {
	return x.major === y.major && (x.minor ?? 0) === (y.minor ?? 0) && (x.patch ?? 0) === (y.patch ?? 0) && (x.revision ?? 0) === (y.revision ?? 0);
}
/**
* NuGet ordering, plus the Paket rule that the literal `prerelease` suffix
* sorts below any other prerelease of the same release version, so that
* `1.2.3-prerelease` acts as an "any prerelease of 1.2.3" floor.
*/
function compare(x, y) {
	if (x.prerelease && y.prerelease && sameReleaseParts(x, y)) {
		const xSentinel = x.prerelease === "prerelease";
		if (xSentinel !== (y.prerelease === "prerelease")) return xSentinel ? -1 : 1;
	}
	return compare$1(x, y);
}
//#endregion
export { compare, sameReleaseParts };

//# sourceMappingURL=version.js.map