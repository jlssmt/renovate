import { joinUrlParts } from "../../../util/url.js";
import { assignKeys } from "../../../util/assign-keys.js";
import { GemMetadata, GemVersions } from "./schema.js";
//#region lib/modules/datasource/rubygems/common.ts
function assignMetadata(releases, metadata) {
	return assignKeys(releases, metadata, [
		"changelogUrl",
		"sourceUrl",
		"homepage"
	]);
}
function getV1Metadata(http, registryUrl, packageName) {
	const metadataUrl = joinUrlParts(registryUrl, "/api/v1/gems", `${packageName}.json`);
	return http.getJsonSafe(metadataUrl, GemMetadata);
}
function getV1Releases(http, registryUrl, packageName) {
	const versionsUrl = joinUrlParts(registryUrl, "/api/v1/versions", `${packageName}.json`);
	return http.getJsonSafe(versionsUrl, GemVersions).transform((releaseResult) => getV1Metadata(http, registryUrl, packageName).transform((metadata) => assignMetadata(releaseResult, metadata)).unwrapOr(releaseResult));
}
//#endregion
export { assignMetadata, getV1Metadata, getV1Releases };

//# sourceMappingURL=common.js.map