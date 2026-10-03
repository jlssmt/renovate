import { regEx } from "../../../util/regex.js";
import { logger } from "../../../logger/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { resolvePaginationUrl } from "../util.js";
import { massageUrl, removeBuildMeta } from "./common.js";
import { XmlDocument } from "xmldoc";
//#region lib/modules/datasource/nuget/v2.ts
var NugetV2Api = class {
	getPkgProp(pkgInfo, propName) {
		return pkgInfo.childNamed("m:properties")?.childNamed(`d:${propName}`)?.val;
	}
	async getReleases(http, feedUrl, pkgName, allowCrossOrigin) {
		const dep = { releases: [] };
		let pkgUrlList = `${feedUrl.replace(regEx(/\/+$/), "")}/FindPackagesById()?id=%27${pkgName}%27&$select=Version,IsLatestVersion,ProjectUrl,Published`;
		while (pkgUrlList !== null) {
			const pkgVersionsListRaw = await http.getText(pkgUrlList);
			const pkgVersionsListDoc = new XmlDocument(pkgVersionsListRaw.body);
			const pkgInfoList = pkgVersionsListDoc.childrenNamed("entry");
			for (const pkgInfo of pkgInfoList) {
				const version = this.getPkgProp(pkgInfo, "Version");
				const releaseTimestamp = asTimestamp(this.getPkgProp(pkgInfo, "Published"));
				dep.releases.push({
					version: removeBuildMeta(`${version}`),
					releaseTimestamp
				});
				try {
					if (this.getPkgProp(pkgInfo, "IsLatestVersion") === "true") {
						dep.tags = { latest: removeBuildMeta(`${version}`) };
						const projectUrl = this.getPkgProp(pkgInfo, "ProjectUrl");
						if (projectUrl) dep.sourceUrl = massageUrl(projectUrl);
					}
				} catch (err) /* istanbul ignore next */ {
					logger.debug({
						err,
						pkgName,
						feedUrl
					}, `nuget registry failure: can't parse pkg info for project url`);
				}
			}
			const nextHref = pkgVersionsListDoc.childrenNamed("link").find((node) => node.attr.rel === "next")?.attr.href;
			const nextUrl = nextHref ? resolvePaginationUrl(pkgUrlList, nextHref, allowCrossOrigin) : null;
			if (nextHref && !nextUrl) logger.once.warn({
				feedUrl,
				nextUrl: nextHref
			}, "Ignoring cross-origin or invalid NuGet feed pagination link");
			pkgUrlList = nextUrl;
		}
		if (dep.releases.length === 0) return null;
		return dep;
	}
};
//#endregion
export { NugetV2Api };

//# sourceMappingURL=v2.js.map