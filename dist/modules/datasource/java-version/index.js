import { logger } from "../../../logger/index.js";
import { Datasource } from "../datasource.js";
import { datasource, parsePackage } from "./common.js";
import { adoptiumRegistryUrl, getAdoptiumReleases } from "./adoptium.js";
import { getGraalvmReleases, graalvmRegistryUrl } from "./graalvm.js";
//#region lib/modules/datasource/java-version/index.ts
var JavaVersionDatasource = class extends Datasource {
	static id = datasource;
	constructor() {
		super(datasource);
	}
	getDefaultRegistryUrls(packageName) {
		return packageName.includes("oracle-graalvm") ? [graalvmRegistryUrl] : [adoptiumRegistryUrl];
	}
	supportsCustomRegistry(packageName) {
		return packageName.includes("oracle-graalvm");
	}
	async fetchReleases({ registryUrl, packageName }) {
		const pkgConfig = parsePackage(packageName);
		logger.trace({
			registryUrl,
			packageName,
			pkgConfig
		}, "fetching java release");
		try {
			if (pkgConfig.vendor === "oracle-graalvm") {
				const effectiveRegistryUrl = registryUrl ?? "https://mise-java.jdx.dev/";
				return await getGraalvmReleases(this.http, pkgConfig, effectiveRegistryUrl);
			}
			return await getAdoptiumReleases(this.http, pkgConfig);
		} catch (err) {
			this.handleGenericErrors(err);
		}
	}
	getReleases(config) {
		return this.cached({
			key: `${config.registryUrl}:${config.packageName}`,
			cacheable: true,
			fallback: true
		}, () => this.fetchReleases(config));
	}
};
//#endregion
export { JavaVersionDatasource };

//# sourceMappingURL=index.js.map