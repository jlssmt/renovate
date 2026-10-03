import { parseUrl } from "../../../util/url.js";
//#region lib/modules/datasource/maven/common.ts
const MAVEN_REPO = "https://repo.maven.apache.org/maven2";
const MAVEN_CENTRAL_MIRROR = "https://repo1.maven.org/maven2";
const MAVEN_CENTRAL_URLS = [MAVEN_REPO, MAVEN_CENTRAL_MIRROR];
function getHost(url) {
	return parseUrl(url)?.host;
}
function isMavenCentral(url) {
	return MAVEN_CENTRAL_URLS.some((mavenRepo) => getHost(url) === getHost(mavenRepo));
}
//#endregion
export { MAVEN_CENTRAL_MIRROR, MAVEN_CENTRAL_URLS, MAVEN_REPO, isMavenCentral };

//# sourceMappingURL=common.js.map