import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/galaxy-collection/schema.ts
const GalaxyV3 = z.object({
	deprecated: z.boolean(),
	highest_version: z.object({ version: z.string() })
});
const GalaxyV3Versions = z.object({ data: z.array(z.object({
	version: z.string(),
	created_at: MaybeTimestamp
})) }).transform(({ data }) => {
	return data.map((value) => {
		return {
			version: value.version,
			releaseTimestamp: value.created_at
		};
	});
});
const GalaxyV3DetailedVersion = z.object({
	version: z.string(),
	download_url: z.string(),
	artifact: z.object({ sha256: z.string() }),
	metadata: z.object({
		homepage: z.string().optional(),
		repository: z.string(),
		dependencies: z.record(z.string(), z.string()).optional()
	})
}).transform((value) => {
	return {
		version: value.version,
		downloadUrl: value.download_url,
		newDigest: value.artifact.sha256,
		dependencies: value.metadata.dependencies,
		sourceUrl: value.metadata.repository
	};
});
//#endregion
export { GalaxyV3, GalaxyV3DetailedVersion, GalaxyV3Versions };

//# sourceMappingURL=schema.js.map