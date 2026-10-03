import { z } from "zod/v4";
//#region lib/modules/datasource/unity3d/schema.ts
const UnityReleaseNote = z.object({ url: z.string() });
const UnityRelease = z.object({
	version: z.string(),
	releaseDate: z.string(),
	releaseNotes: UnityReleaseNote,
	shortRevision: z.string()
});
const UnityReleasesJSON = z.object({
	total: z.number(),
	results: UnityRelease.array()
});
//#endregion
export { UnityReleasesJSON };

//# sourceMappingURL=schema.js.map