import { z } from "zod/v4";
//#region lib/modules/datasource/cdnjs/schema.ts
const Homepage = z.string().optional().catch(void 0);
const Repository = z.object({
	type: z.literal("git"),
	url: z.string()
}).transform(({ url }) => url).optional().catch(void 0);
const Versions = z.string().transform((version) => ({ version })).array();
const Sri = z.record(z.string(), z.string());
const CdnjsAPIVersionResponse = z.object({
	homepage: Homepage,
	repository: Repository,
	versions: Versions
});
const CdnjsAPISriResponse = z.object({ sri: Sri });
//#endregion
export { CdnjsAPISriResponse, CdnjsAPIVersionResponse, Homepage, Repository, Sri, Versions };

//# sourceMappingURL=schema.js.map