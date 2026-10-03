import { LooseArray } from "../../../util/schema-utils/index.js";
import { asTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/typst/schema.ts
const ReleaseItem = z.object({
	name: z.string().min(1),
	version: z.string().min(1),
	repository: z.string().url(),
	updatedAt: z.number()
}).transform(({ name: packageName, version, repository: sourceUrl, updatedAt }) => {
	return {
		packageName,
		version,
		sourceUrl,
		releaseTimestamp: asTimestamp(updatedAt)
	};
});
const Registry = LooseArray(ReleaseItem).transform((items) => {
	const result = {};
	for (const item of items) {
		const { packageName, sourceUrl, ...release } = item;
		result[packageName] ??= { releases: [] };
		result[packageName].releases.push(release);
		result[packageName].sourceUrl = sourceUrl;
	}
	return result;
});
//#endregion
export { Registry };

//# sourceMappingURL=schema.js.map