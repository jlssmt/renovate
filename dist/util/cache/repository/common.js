import upath from "upath";
//#region lib/util/cache/repository/common.ts
function getLocalCacheFileName(platform, repository) {
	const repoCachePath = "renovate/repository/";
	const fileName = `${repository}.json`;
	return upath.join(repoCachePath, platform, fileName);
}
//#endregion
export { getLocalCacheFileName };

//# sourceMappingURL=common.js.map