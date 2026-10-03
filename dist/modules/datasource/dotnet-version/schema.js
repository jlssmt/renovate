import { LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/dotnet-version/schema.ts
const ReleasesIndex = z.object({ "releases-index": LooseArray(z.object({ "releases.json": z.string() }).transform(({ "releases.json": releasesUrl }) => releasesUrl)).catch([]) }).transform(({ "releases-index": releasesIndex }) => releasesIndex);
const ReleaseBase = z.object({
	"release-date": MaybeTimestamp,
	"release-notes": z.string()
});
const ReleaseDetails = z.object({ version: z.string() });
const DotnetSdkReleases = z.object({ releases: LooseArray(ReleaseBase.extend({ sdks: z.array(ReleaseDetails) })).catch([]) }).transform(({ releases }) => releases.flatMap(({ sdks, "release-date": releaseTimestamp, "release-notes": changelogUrl }) => sdks.map(({ version }) => ({
	version,
	releaseTimestamp,
	changelogUrl
}))));
const DotnetRuntimeReleases = z.object({ releases: LooseArray(ReleaseBase.extend({ runtime: ReleaseDetails })).catch([]) }).transform(({ releases }) => releases.map(({ runtime: { version }, "release-date": releaseTimestamp, "release-notes": changelogUrl }) => ({
	version,
	releaseTimestamp,
	changelogUrl
})));
//#endregion
export { DotnetRuntimeReleases, DotnetSdkReleases, ReleasesIndex };

//# sourceMappingURL=schema.js.map