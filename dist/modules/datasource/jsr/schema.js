import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/jsr/schema.ts
/**
* In the JSR.io API, if a package has had any version published on or after 2025-09-18,
* the createdAt field will be returned for all versions of that package, including historical ones.
* If a package has not been published at all since this date,
* the createdAt field will be omitted entirely from the API response.
* Therefore, we can assume that it published no less than that date for older versions
* https://github.com/jsr-io/jsr/pull/1194#issuecomment-3522729482
*/
const MINIMUM_RELEASE_TIMESTAMP = MaybeTimestamp.parse("2025-09-18T00:00:00.000Z");
const JsrPackageMetadata = z.object({
	latest: z.string().optional(),
	versions: z.record(z.string(), z.object({
		createdAt: MaybeTimestamp,
		yanked: z.boolean().optional()
	}))
}).transform(({ versions, latest }) => {
	return Object.entries(versions).map(([version, val]) => ({
		version,
		releaseTimestamp: val.createdAt ?? MINIMUM_RELEASE_TIMESTAMP,
		...val.yanked && { isDeprecated: true },
		...latest === version && { isLatest: true }
	}));
});
//#endregion
export { JsrPackageMetadata, MINIMUM_RELEASE_TIMESTAMP };

//# sourceMappingURL=schema.js.map