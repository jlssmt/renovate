import { logger } from "../../../logger/index.js";
import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { MiseJavaRelease } from "./schema.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/java-version/graalvm.ts
const graalvmRegistryUrl = "https://mise-java.jdx.dev/";
async function getGraalvmReleases(http, pkgConfig, registryUrl) {
	logger.trace({
		pkgConfig,
		registryUrl
	}, "fetching GraalVM releases");
	if (!pkgConfig.os || !pkgConfig.architecture) {
		logger.debug({
			os: pkgConfig.os,
			architecture: pkgConfig.architecture
		}, "Cannot fetch GraalVM releases without OS and architecture");
		return null;
	}
	const releaseType = pkgConfig.releaseType ?? "ga";
	const url = joinUrlParts(registryUrl, "jvm", releaseType, pkgConfig.os, `${pkgConfig.architecture}.json`);
	const result = {
		homepage: "https://www.oracle.com/java/graalvm/",
		sourceUrl: "https://github.com/oracle/graal",
		registryUrl,
		releases: []
	};
	try {
		const filteredReleases = (await http.getJson(url, z.array(MiseJavaRelease))).body.filter((release) => {
			return release.vendor === pkgConfig.vendor && release.image_type === pkgConfig.imageType;
		}).map((release) => ({ version: release.version }));
		result.releases.push(...filteredReleases);
	} catch (err) {
		if (err instanceof RequestError) {
			if (err.response?.statusCode === 404) {
				logger.debug({ url }, "GraalVM releases not found (404)");
				return null;
			}
			throw new ExternalHostError(err);
		}
		throw err;
	}
	return result.releases.length ? result : null;
}
//#endregion
export { getGraalvmReleases, graalvmRegistryUrl };

//# sourceMappingURL=graalvm.js.map