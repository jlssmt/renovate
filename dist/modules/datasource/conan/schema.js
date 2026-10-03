import { LooseArray } from "../../../util/schema-utils/index.js";
import { conanDatasourceRegex } from "./common.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/conan/schema.ts
const ConanCenterReleases = z.object({ versions: z.record(z.string(), z.unknown()) }).transform(({ versions }) => ({ releases: Object.keys(versions).map((version) => ({ version })) })).nullable().catch(null);
const ConanJSON = z.object({ results: z.string().array().transform((array) => array.map((val) => val.match(conanDatasourceRegex)?.groups)).pipe(LooseArray(z.object({
	name: z.string(),
	version: z.string(),
	userChannel: z.string()
}))) }).transform(({ results }) => results).nullable().catch(null);
const ConanRevisionJSON = z.object({
	revision: z.string(),
	time: z.string()
});
const ConanLatestRevision = z.object({ revisions: z.unknown().array() }).transform(({ revisions }) => revisions[0]).pipe(ConanRevisionJSON).transform(({ revision }) => revision).nullable().catch(null);
const ConanProperties = z.object({ properties: z.object({ "conan.package.url": z.union([z.string().transform((url) => [url]), z.string().array()]) }) }).transform(({ properties }) => {
	return { sourceUrl: properties["conan.package.url"][0] };
});
//#endregion
export { ConanCenterReleases, ConanJSON, ConanLatestRevision, ConanProperties, ConanRevisionJSON };

//# sourceMappingURL=schema.js.map