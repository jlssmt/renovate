import { joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { isValidLocalPath, readLocalFile } from "../../../util/fs/index.js";
import { Json } from "../../../util/schema-utils/index.js";
import { BzlmodVersion } from "../../versioning/bazel-module/bzlmod-version.js";
import { id } from "../../versioning/bazel-module/index.js";
import { RequestError } from "../../../util/http/got.js";
import "../../../util/http/index.js";
import { Datasource } from "../datasource.js";
import { BazelModuleMetadata } from "./schema.js";
import { isTruthy } from "@sindresorhus/is";
//#region lib/modules/datasource/bazel/index.ts
var BazelDatasource = class BazelDatasource extends Datasource {
	static id = "bazel";
	static bazelCentralRepoUrl = "https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main";
	getDefaultRegistryUrls(_packageName) {
		return [BazelDatasource.bazelCentralRepoUrl];
	}
	registryStrategy = "hunt";
	supportsCustomRegistry(_packageName) {
		return true;
	}
	defaultVersioning = id;
	static packageMetadataPath(packageName) {
		return `/modules/${packageName}/metadata.json`;
	}
	constructor() {
		super(BazelDatasource.id);
	}
	async fetchReleases({ registryUrl, packageName }) {
		const path = BazelDatasource.packageMetadataPath(packageName);
		const url = joinUrlParts(registryUrl, path);
		const result = { releases: [] };
		try {
			let metadata;
			if (url.startsWith("file://")) {
				const filePath = url.slice(7);
				if (!isValidLocalPath(filePath)) return null;
				const fileContent = await readLocalFile(filePath, "utf8");
				if (!fileContent) return null;
				metadata = Json.pipe(BazelModuleMetadata).parse(fileContent);
			} else metadata = (await this.http.getJson(url, BazelModuleMetadata)).body;
			result.releases = metadata.versions.map((v) => new BzlmodVersion(v)).sort(BzlmodVersion.defaultCompare).map((bv) => {
				const release = { version: bv.original };
				if (isTruthy(metadata.yanked_versions?.[bv.original])) release.isDeprecated = true;
				return release;
			});
			if (metadata.homepage) result.homepage = metadata.homepage;
		} catch (err) {
			if (err instanceof RequestError) {
				if (err.response?.statusCode === 404) return null;
				throw new ExternalHostError(err);
			}
			this.handleGenericErrors(err);
		}
		return result.releases.length ? result : null;
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { BazelDatasource };

//# sourceMappingURL=index.js.map