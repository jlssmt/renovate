import { LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { getSourceUrl } from "../../../util/github/url.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/deno/schema.ts
const DenoApiTag = z.object({
	kind: z.string(),
	value: z.string()
});
const DenoAPIModuleResponse = z.object({
	tags: LooseArray(DenoApiTag).transform((tags) => {
		const record = {};
		for (const { kind, value } of tags) record[kind] = value;
		return record;
	}).catch({}),
	versions: z.array(z.string())
});
const DenoAPIUploadOptions = z.object({
	ref: z.string(),
	type: z.union([z.literal("github"), z.unknown()]),
	repository: z.string(),
	subdir: z.string().optional()
});
const DenoAPIModuleVersionResponse = z.object({
	upload_options: DenoAPIUploadOptions,
	uploaded_at: MaybeTimestamp,
	version: z.string()
}).transform(({ version, uploaded_at: releaseTimestamp, upload_options }) => {
	let sourceUrl = void 0;
	const { type, repository, ref: gitRef } = upload_options;
	if (type === "github") sourceUrl = getSourceUrl(repository);
	return {
		version,
		gitRef,
		releaseTimestamp,
		sourceUrl
	};
});
//#endregion
export { DenoAPIModuleResponse, DenoAPIModuleVersionResponse, DenoAPIUploadOptions, DenoApiTag };

//# sourceMappingURL=schema.js.map