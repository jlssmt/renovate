import { z } from "zod/v4";
//#region lib/util/http/cache/schema.ts
const HttpCacheHeaders = z.record(z.string(), z.union([z.string(), z.array(z.string())]).optional());
const HttpCacheResponse = z.object({
	statusCode: z.number(),
	headers: HttpCacheHeaders,
	body: z.unknown(),
	authorization: z.boolean().optional(),
	cached: z.boolean().optional()
});
const HttpCache = z.object({
	etag: z.string().optional(),
	lastModified: z.string().optional(),
	httpResponse: HttpCacheResponse,
	timestamp: z.string()
}).nullable().catch(null);
//#endregion
export { HttpCache, HttpCacheResponse };

//# sourceMappingURL=schema.js.map