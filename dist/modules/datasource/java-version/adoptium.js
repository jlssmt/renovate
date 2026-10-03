import { logger } from "../../../logger/index.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import "./common.js";
import { AdoptiumJavaResponse } from "./schema.js";
//#region lib/modules/datasource/java-version/adoptium.ts
const adoptiumRegistryUrl = "https://api.adoptium.net/";
async function getPageReleases(http, url, page) {
	const pgUrl = `${url}&page=${page}`;
	try {
		return (await http.getJson(pgUrl, AdoptiumJavaResponse))?.body?.versions?.map(({ semver }) => ({ version: semver })) ?? null;
	} catch (err) {
		if (page !== 0 && err instanceof RequestError && err.response?.statusCode === 404) return null;
		throw err;
	}
}
async function getAdoptiumReleases(http, pkgConfig) {
	logger.trace({ pkgConfig }, "fetching Adoptium releases");
	let url = `${adoptiumRegistryUrl}v3/info/release_versions?page_size=50&image_type=${pkgConfig.imageType}&project=jdk&release_type=ga&sort_method=DATE&sort_order=DESC`;
	if (pkgConfig.architecture) url += `&architecture=${pkgConfig.architecture}`;
	if (pkgConfig.os) url += `&os=${pkgConfig.os}`;
	const result = {
		homepage: "https://adoptium.net",
		releases: []
	};
	try {
		let page = 0;
		let releases = await getPageReleases(http, url, page);
		while (releases) {
			result.releases.push(...releases);
			if (releases.length !== 50 || page >= 50) break;
			page += 1;
			releases = await getPageReleases(http, url, page);
		}
	} catch (err) {
		if (err instanceof RequestError) {
			if (err.response?.statusCode !== 404) throw new ExternalHostError(err);
			return null;
		}
		throw err;
	}
	return result.releases.length ? result : null;
}
//#endregion
export { adoptiumRegistryUrl, getAdoptiumReleases };

//# sourceMappingURL=adoptium.js.map