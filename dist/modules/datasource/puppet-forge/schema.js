import { DeepNullish, LooseArray } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { isTruthy } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/puppet-forge/schema.ts
const PuppetReleaseAbbreviated = DeepNullish(z.object({
	version: z.string(),
	created_at: MaybeTimestamp,
	deleted_at: z.string().optional(),
	file_uri: z.string().optional()
})).transform(({ version, created_at, deleted_at, file_uri }) => {
	if (deleted_at) return null;
	const release = { version };
	if (file_uri) release.downloadUrl = file_uri;
	if (created_at) release.releaseTimestamp = created_at;
	return release;
});
const PuppetModule = DeepNullish(z.object({
	releases: LooseArray(PuppetReleaseAbbreviated).default([]),
	homepage_url: z.string().optional(),
	deprecated_for: z.string().optional()
})).transform((module) => {
	const result = { releases: module.releases.filter(isTruthy) };
	if (module.homepage_url) result.homepage = module.homepage_url;
	if (module.deprecated_for) result.deprecationMessage = module.deprecated_for;
	return result;
});
//#endregion
export { PuppetModule, PuppetReleaseAbbreviated };

//# sourceMappingURL=schema.js.map