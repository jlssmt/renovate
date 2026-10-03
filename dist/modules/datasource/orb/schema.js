import { DeepNullish, LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/orb/schema.ts
const OrbVersion = z.object({ attributes: z.object({
	version: z.string(),
	created_at: MaybeTimestamp
}) }).transform(({ attributes }) => ({
	version: attributes.version,
	releaseTimestamp: attributes.created_at
}));
const OrbPackage = z.object({
	attributes: DeepNullish(z.object({
		is_private: z.boolean().optional(),
		home_url: z.string().optional()
	})),
	references: z.object({ orb_versions: LooseArray(OrbVersion).catch([]) }).default({ orb_versions: [] })
}).transform(({ attributes, references }) => ({
	homeUrl: attributes.home_url,
	isPrivate: !!attributes.is_private,
	releases: references.orb_versions
}));
const OrbPackagesResponse = z.object({ data: z.array(OrbPackage) });
//#endregion
export { OrbPackagesResponse };

//# sourceMappingURL=schema.js.map