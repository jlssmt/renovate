import { regEx } from "../../../util/regex.js";
import { detectPlatform } from "../../../util/common.js";
import { LooseRecord } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { parseGitUrl } from "../../../util/git/url.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/helm/schema.ts
const HelmRelease = z.object({
	version: z.string(),
	created: MaybeTimestamp,
	digest: z.string().optional().catch(void 0),
	home: z.string().optional().catch(void 0),
	sources: z.array(z.string()).catch([]),
	urls: z.array(z.string()).catch([])
});
const chartRepo = regEx(/charts?|helm|helm-charts/i);
function isPossibleChartRepo(url) {
	if (detectPlatform(url) === null) return false;
	const parsed = parseGitUrl(url);
	return chartRepo.test(parsed.name);
}
const githubRelease = regEx(/^(?<repoUrl>https:\/\/github\.com\/[^/]+\/[^/]+)\/releases\//);
function getSourceUrl(release) {
	const [githubUrl] = release.urls;
	const releaseMatch = githubRelease.exec(githubUrl);
	if (releaseMatch) return releaseMatch.groups.repoUrl;
	if (release.home && isPossibleChartRepo(release.home)) return release.home;
	for (const url of release.sources) if (isPossibleChartRepo(url)) return url;
	return release.sources[0];
}
const HelmRepository = z.object({ entries: LooseRecord(z.string(), HelmRelease.array().min(1).transform((helmReleases) => {
	const latestRelease = helmReleases[0];
	return {
		homepage: latestRelease.home,
		sourceUrl: getSourceUrl(latestRelease),
		releases: helmReleases.map(({ version, created: releaseTimestamp, digest: newDigest }) => ({
			version,
			releaseTimestamp,
			newDigest
		}))
	};
})) }).transform(({ entries }) => entries);
//#endregion
export { HelmRepository };

//# sourceMappingURL=schema.js.map