import "../../../constants/error-messages.js";
import { logger } from "../../../logger/index.js";
import { getQueryString, joinUrlParts } from "../../../util/url.js";
import { ExternalHostError } from "../../../types/errors/external-host-error.js";
import { withCache } from "../../../util/cache/package/with-cache.js";
import { refusedHostMessage } from "../../../util/http/util.js";
import { Datasource } from "../datasource.js";
import { RepologyPackages } from "./schema.js";
import { isNonEmptyArray } from "@sindresorhus/is";
//#region lib/modules/datasource/repology/index.ts
const packageTypes = ["binname", "srcname"];
function findPackageInResponse(response, repoName, pkgName, types) {
	const repoPackages = response.filter((pkg) => pkg.repo === repoName);
	if (repoPackages.length === 0) return null;
	if (repoPackages.length === 1) return repoPackages;
	const packagesWithType = repoPackages.filter((pkg) => {
		for (const pkgType of types) if (pkg[pkgType] && pkg[pkgType] === pkgName) return true;
		return false;
	});
	return packagesWithType.length > 0 ? packagesWithType : null;
}
var RepologyDatasource = class RepologyDatasource extends Datasource {
	static id = "repology";
	getDefaultRegistryUrls(_packageName) {
		return ["https://repology.org/"];
	}
	registryStrategy = "hunt";
	constructor() {
		super(RepologyDatasource.id);
	}
	async queryPackages(url) {
		try {
			return (await this.http.getJson(url, RepologyPackages)).body;
		} catch (err) {
			if (err.statusCode === 404) return [];
			throw err;
		}
	}
	async queryPackagesViaResolver(registryUrl, repoName, packageName, packageType) {
		const query = getQueryString({
			repo: repoName,
			name_type: packageType,
			target_page: "api_v1_project",
			noautoresolve: "on",
			name: packageName
		});
		return await this.queryPackages(joinUrlParts(registryUrl, `tools/project-by?${query}`));
	}
	async queryPackagesViaAPI(registryUrl, packageName) {
		return await this.queryPackages(joinUrlParts(registryUrl, `api/v1/project`, packageName));
	}
	async _queryPackage(registryUrl, repoName, pkgName) {
		let response;
		try {
			for (const pkgType of packageTypes) {
				response = await this.queryPackagesViaResolver(registryUrl, repoName, pkgName, pkgType);
				// v8 ignore else -- the resolver either returns a body or throws
				if (response) {
					const pkg = findPackageInResponse(response, repoName, pkgName, [pkgType]);
					if (isNonEmptyArray(pkg)) return pkg;
				}
			}
		} catch (err) {
			if (err.statusCode === 403) {
				logger.debug({
					repoName,
					pkgName
				}, "Repology does not support tools/project-by lookups for repository. Will try direct API access now");
				response = await this.queryPackagesViaAPI(registryUrl, pkgName);
				const pkg = findPackageInResponse(response, repoName, pkgName, packageTypes);
				if (isNonEmptyArray(pkg)) return pkg;
			} else if (err.statusCode === 300) {
				logger.warn({
					repoName,
					pkgName
				}, "Ambiguous redirection from package name to project name in Repology. Skipping this package");
				return;
			}
			throw err;
		}
		logger.debug({
			repoName,
			pkgName
		}, "Repository or package not found on Repology");
	}
	queryPackage(registryUrl, repoName, pkgName) {
		return withCache({
			ttlMinutes: 60,
			namespace: `datasource-${RepologyDatasource.id}`,
			key: joinUrlParts(registryUrl, repoName, pkgName)
		}, () => this._queryPackage(registryUrl, repoName, pkgName));
	}
	async getReleases({ packageName, registryUrl }) {
		/* v8 ignore next -- should never happen */
		if (!registryUrl) return null;
		const [repoName, pkgName] = packageName.split("/", 2);
		if (!repoName || !pkgName) throw new ExternalHostError(/* @__PURE__ */ new Error("Repology lookup name must contain repository and package separated by slash (<repo>/<pkg>)"));
		logger.trace(`repology.getReleases(${repoName}, ${pkgName})`);
		try {
			const pkg = await this.queryPackage(registryUrl, repoName, pkgName);
			if (!pkg) return null;
			return { releases: pkg.map((item) => ({ version: item.origversion ?? item.version })) };
		} catch (err) {
			if (["host-blocked", "host-disabled"].includes(err.message)) logger.trace({
				packageName,
				err
			}, refusedHostMessage(err));
			else logger.once.warn({
				packageName,
				err
			}, "Repology lookup failed with unexpected error");
			this.handleGenericErrors(err);
		}
	}
};
//#endregion
export { RepologyDatasource };

//# sourceMappingURL=index.js.map