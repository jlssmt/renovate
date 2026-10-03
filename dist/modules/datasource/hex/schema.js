import { LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { isPlainObject } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/hex/schema.ts
const HexRelease = z.object({
	html_url: z.string().optional(),
	meta: z.object({ links: z.record(z.string(), z.string()).transform((links) => Object.fromEntries(Object.entries(links).map(([key, value]) => [key.toLowerCase(), value]))).pipe(z.object({ github: z.string() })) }).nullable().catch(null),
	releases: LooseArray(z.object({
		version: z.string(),
		inserted_at: MaybeTimestamp
	})).refine((releases) => releases.length > 0, "No releases found"),
	retirements: z.record(z.string(), z.object({
		message: z.string().nullable(),
		reason: z.string()
	})).optional()
}).transform((hexResponse) => {
	const releaseResult = { releases: hexResponse.releases.map(({ version, inserted_at: releaseTimestamp }) => {
		const release = { version };
		if (releaseTimestamp) release.releaseTimestamp = releaseTimestamp;
		if (isPlainObject(hexResponse.retirements?.[version])) release.isDeprecated = true;
		return release;
	}) };
	if (hexResponse.html_url) releaseResult.homepage = hexResponse.html_url;
	if (hexResponse.meta?.links?.github) releaseResult.sourceUrl = hexResponse.meta.links.github;
	return releaseResult;
});
//#endregion
export { HexRelease };

//# sourceMappingURL=schema.js.map