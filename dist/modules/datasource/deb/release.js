//#region lib/modules/datasource/deb/release.ts
/**
* Checks if two release metadata objects match.
*
* @param lhs - The first release result.
* @param rhs - The second release result.
* @returns True if the metadata matches, otherwise false.
*/
function releaseMetaInformationMatches(lhs, rhs) {
	return lhs.homepage === rhs.homepage;
}
/**
* Formats the package description into a ReleaseResult.
*
* @param packagesDesc - list of package description objects.
* @returns A formatted ReleaseResult.
*/
function formatReleaseResult(packagesDesc) {
	return {
		releases: packagesDesc.map((p) => ({ version: p.Version })),
		homepage: packagesDesc[0]?.Homepage
	};
}
//#endregion
export { formatReleaseResult, releaseMetaInformationMatches };

//# sourceMappingURL=release.js.map