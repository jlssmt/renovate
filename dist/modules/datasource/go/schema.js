import { MaybeTimestamp, Timestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/go/schema.ts
const VersionInfo = z.object({
	Version: z.string(),
	Time: MaybeTimestamp,
	Origin: z.object({
		VCS: z.string().optional(),
		URL: z.string().optional()
	}).optional()
});
/**
* The publication time of each version of a module, as served by a given Go proxy.
*/
const VersionTimestamps = z.record(z.string(), Timestamp).catch({});
//#endregion
export { VersionInfo, VersionTimestamps };

//# sourceMappingURL=schema.js.map