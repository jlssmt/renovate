import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/devbox/schema.ts
const DevboxRelease = z.object({
	version: z.string(),
	last_updated: MaybeTimestamp
});
const DevboxResponse = z.object({
	name: z.string(),
	summary: z.string().optional(),
	homepage_url: z.string().optional(),
	license: z.string().optional(),
	releases: DevboxRelease.array()
}).transform((response) => ({
	name: response.name,
	homepage: response.homepage_url,
	releases: response.releases.map((release) => ({
		version: release.version,
		releaseTimestamp: release.last_updated
	}))
}));
//#endregion
export { DevboxRelease, DevboxResponse };

//# sourceMappingURL=schema.js.map