import { z } from "zod/v4";
//#region lib/modules/datasource/conda/schema/prefix-dev.ts
const File = z.object({
	version: z.string(),
	createdAt: z.string().nullable(),
	yankedReason: z.string().nullable(),
	urls: z.array(z.object({
		url: z.string(),
		kind: z.string()
	})).optional().default([]).transform((urls) => {
		return Object.fromEntries(urls.map((url) => [url.kind, url.url]));
	})
});
const PagedResponse = z.object({ data: z.object({ package: z.object({ variants: z.object({
	pages: z.number(),
	page: z.array(File)
}).nullable() }).nullable() }) });
//#endregion
export { File, PagedResponse };

//# sourceMappingURL=prefix-dev.js.map