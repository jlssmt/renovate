import { LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/cpan/schema.ts
/**
* https://fastapi.metacpan.org/v1/file/_mapping
*/
const MetaCpanApiFile = z.object({
	module: LooseArray(z.object({
		name: z.string(),
		version: z.string()
	})),
	distribution: z.string(),
	date: MaybeTimestamp,
	deprecated: z.boolean(),
	maturity: z.string(),
	status: z.union([
		z.literal("backpan"),
		z.literal("cpan"),
		z.literal("latest")
	])
}).transform(({ module, distribution, date, deprecated, maturity, status }) => {
	if (!module[0]?.version) return;
	return {
		version: module[0].version,
		distribution,
		isDeprecated: deprecated,
		isStable: maturity === "released",
		releaseTimestamp: date,
		isLatest: status === "latest"
	};
}).catch(void 0);
/**
* https://github.com/metacpan/metacpan-api/blob/master/docs/API-docs.md#available-fields
*/
const MetaCpanApiFileSearchResponse = z.object({ hits: z.object({ hits: LooseArray(z.object({ _source: MetaCpanApiFile })) }) }).transform((data) => {
	return data.hits.hits.map((hit) => hit._source).filter((source) => source !== void 0);
});
//#endregion
export { MetaCpanApiFileSearchResponse };

//# sourceMappingURL=schema.js.map