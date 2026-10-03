import { z } from "zod/v4";
//#region lib/modules/datasource/unity3d-packages/schema.ts
const Upm = z.object({ changelog: z.string().optional() });
const Repository = z.object({ url: z.string().optional() });
const UnityPackageRelease = z.object({
	_upm: Upm.optional(),
	documentationUrl: z.string().optional(),
	repository: Repository.optional(),
	version: z.string()
});
const UnityPackageReleasesJSON = z.object({
	versions: z.record(z.string(), UnityPackageRelease),
	time: z.record(z.string(), z.string())
});
//#endregion
export { UnityPackageReleasesJSON };

//# sourceMappingURL=schema.js.map