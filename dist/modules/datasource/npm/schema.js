import { DeepNullish, LooseRecord } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/npm/schema.ts
const Repository = z.union([z.string(), DeepNullish(z.object({
	url: z.string().optional(),
	directory: z.string().optional()
}))]);
const RepositoryNpmResponse = z.unknown().transform((val) => Array.isArray(val) ? val[0] : val).pipe(Repository);
const Attestations = z.object({ url: z.string().optional() });
const Distribution = z.object({
	attestations: Attestations.optional(),
	integrity: z.string().optional(),
	tarball: z.string().optional()
});
const NpmResponseVersion = z.object({
	repository: RepositoryNpmResponse.optional(),
	homepage: z.string().optional().catch(void 0),
	deprecated: z.union([z.string(), z.boolean()]).optional(),
	gitHead: z.string().optional(),
	dependencies: LooseRecord(z.string()).optional(),
	devDependencies: LooseRecord(z.string()).optional(),
	engines: z.object({ node: z.string().optional() }).optional().catch(void 0),
	dist: Distribution.optional()
});
const CachedPackument = DeepNullish(z.object({
	versions: z.record(z.string(), NpmResponseVersion).optional(),
	repository: Repository.optional(),
	homepage: z.string().optional().catch(void 0),
	time: LooseRecord(z.string()).optional(),
	"dist-tags": z.record(z.string(), z.string()).optional()
}));
/**
* Full NpmResponse schema — used when fetching from the npm registry.
* Lenient: only validates fields Renovate actually reads.
* Uses loose() on the version objects to preserve extra fields
* (e.g. 'renovate-config' used by config/presets/npm/index.ts).
*/
const NpmResponseVersionLoose = NpmResponseVersion.loose();
const NpmResponse = z.object({
	_id: z.string().optional(),
	name: z.string().optional(),
	versions: z.record(z.string(), NpmResponseVersionLoose).optional(),
	repository: RepositoryNpmResponse.optional(),
	homepage: z.string().optional().catch(void 0),
	time: LooseRecord(z.string()).optional(),
	"dist-tags": z.record(z.string(), z.string()).optional()
});
//#endregion
export { CachedPackument, NpmResponse, NpmResponseVersion };

//# sourceMappingURL=schema.js.map