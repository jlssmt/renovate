import { LooseArray } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/flutter-version/schema.ts
const FlutterRelease = z.object({
	hash: z.string().optional(),
	channel: z.string(),
	version: z.string(),
	dart_sdk_version: z.string().optional(),
	dart_sdk_arch: z.string().optional(),
	release_date: z.string().optional(),
	archive: z.string().optional(),
	sha256: z.string().optional()
});
const FlutterResponse = z.object({
	base_url: z.string().optional(),
	current_release: z.record(z.string(), z.string()).optional(),
	releases: LooseArray(FlutterRelease)
});
//#endregion
export { FlutterRelease, FlutterResponse };

//# sourceMappingURL=schema.js.map