import { newlineRegex } from "../../../util/regex.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { filterMap } from "../../../util/filter-map.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { isEmptyArray, isEmptyObject } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/rubygems/schema.ts
const MarshalledVersionInfo = LooseArray(z.object({ number: z.string() }).transform(({ number: version }) => ({ version }))).refine((value) => !isEmptyArray(value), "Empty response from `/v1/dependencies` endpoint").transform((releases) => ({ releases }));
const GemMetadata = z.object({
	changelog_uri: z.string().optional().catch(void 0),
	homepage_uri: z.string().optional().catch(void 0),
	source_code_uri: z.string().optional().catch(void 0)
}).transform(({ changelog_uri: changelogUrl, homepage_uri: homepage, source_code_uri: sourceUrl }) => ({
	changelogUrl,
	homepage,
	sourceUrl
}));
const GemVersions = LooseArray(z.object({
	number: z.string(),
	created_at: MaybeTimestamp,
	platform: z.string().optional().catch(void 0),
	ruby_version: z.string().optional().catch(void 0),
	rubygems_version: z.string().optional().catch(void 0),
	metadata: z.object({
		changelog_uri: z.string().optional().catch(void 0),
		source_code_uri: z.string().optional().catch(void 0)
	}).catch({})
}).transform(({ number: version, created_at: releaseTimestamp, platform, ruby_version: rubyVersion, rubygems_version: rubygemsVersion, metadata }) => {
	const result = {
		version,
		releaseTimestamp
	};
	const constraints = {};
	if (platform) constraints.platform = [platform];
	if (rubyVersion) constraints.ruby = [rubyVersion];
	if (rubygemsVersion) constraints.rubygems = [rubygemsVersion];
	if (!isEmptyObject(constraints)) result.constraints = constraints;
	if (metadata.changelog_uri) result.changelogUrl = metadata.changelog_uri;
	if (metadata.source_code_uri) result.sourceUrl = metadata.source_code_uri;
	return result;
})).refine((value) => !isEmptyArray(value), "Empty response from `/v1/gems` endpoint").transform((releases) => ({ releases }));
const GemInfo = z.string().transform((body) => filterMap(body.split(newlineRegex), (line) => {
	const spaceIdx = line.indexOf(" ");
	return spaceIdx > 0 ? line.slice(0, spaceIdx) : null;
}).map((version) => ({ version }))).refine((value) => !isEmptyArray(value), "Empty response from `/info` endpoint").transform((releases) => ({ releases }));
//#endregion
export { GemInfo, GemMetadata, GemVersions, MarshalledVersionInfo };

//# sourceMappingURL=schema.js.map