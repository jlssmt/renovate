import { regEx } from "../../../util/regex.js";
import { coerceArray } from "../../../util/array.js";
import { parseUrl } from "../../../util/url.js";
import { Json, LooseRecord, Nullish, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/npm/schema.ts
function hasEnvVar(value) {
	return value.includes("${");
}
function withoutEnvVarRegistries(registries) {
	return Object.fromEntries(Object.entries(registries).filter(([, url]) => !hasEnvVar(url)));
}
/**
* pnpm ignores a registry URL which interpolates an env var, and refuses one
* which embeds credentials, because `pnpm-workspace.yaml` is committed to the
* repository.
*/
function isUsableRegistryUrl(url) {
	if (hasEnvVar(url)) return false;
	const parsed = parseUrl(url);
	return !!parsed && !parsed.username && !parsed.password;
}
/**
* A registry of the URL-keyed `registries` shape, added in pnpm v11.23.
*
* Only `scopes` routes packages to the registry: `prefix` names a
* bare-specifier alias which we do not support yet, while `serverType` and
* `supportsTimeField` merely describe the server.
*
* https://pnpm.io/registries
*/
const PnpmRegistry = Nullish(z.object({ scopes: z.array(z.string()).optional() }));
/**
* Flatten the URL-keyed shape into the older `<scope>: <url>` one, so that both
* shapes resolve the same way.
*/
function scopeRoutesFromRegistries(registries) {
	const result = {};
	for (const [url, registry] of Object.entries(registries)) {
		if (!isUsableRegistryUrl(url)) continue;
		for (const scope of coerceArray(registry?.scopes)) result[scope === "@" ? "default" : scope] = url;
	}
	return result;
}
const PnpmCatalogs = z.object({
	catalog: z.optional(z.record(z.string(), z.string())),
	catalogs: z.optional(z.record(z.string(), z.record(z.string(), z.string())))
});
const YarnCatalogs = z.object({
	catalog: z.optional(z.record(z.string(), z.string())),
	catalogs: z.optional(z.record(z.string(), z.record(z.string(), z.string()))).catch(void 0)
});
const YarnConfig = Yaml.pipe(z.object({
	npmRegistryServer: z.string().optional(),
	npmScopes: z.record(z.string(), z.object({ npmRegistryServer: z.string().optional() })).optional()
}).and(YarnCatalogs));
const PnpmWorkspaceFile = Yaml.pipe(z.object({
	packages: z.array(z.string()).optional(),
	minimumReleaseAge: Nullish(z.number()),
	minimumReleaseAgeExclude: z.array(z.string()).optional(),
	overrides: z.record(z.string(), z.string()).optional(),
	registry: Nullish(z.string()),
	registries: Nullish(z.union([z.record(z.string(), z.string()).transform(withoutEnvVarRegistries), z.record(z.string(), PnpmRegistry).transform(scopeRoutesFromRegistries)])).catch(void 0)
}).and(PnpmCatalogs));
const PackageManager = z.string().transform((val) => val.split("@")).transform(([name, ...version]) => ({
	name,
	version: version.join("@")
}));
const DevEngineDependency = z.object({
	name: z.string(),
	version: z.string().optional()
});
const DevEngine = z.object({ packageManager: DevEngineDependency.or(z.array(DevEngineDependency)).optional() });
const PackageJson = Json.pipe(z.object({
	devEngines: DevEngine.optional(),
	engines: LooseRecord(z.string()).optional(),
	dependencies: LooseRecord(z.string()).optional(),
	devDependencies: LooseRecord(z.string()).optional(),
	peerDependencies: LooseRecord(z.string()).optional(),
	packageManager: PackageManager.optional(),
	volta: LooseRecord(z.string()).optional()
}));
const PackageLockV3 = z.object({
	lockfileVersion: z.literal(3),
	packages: LooseRecord(z.string().transform((x) => x.replace(regEx(/^node_modules\//), "")).refine((x) => x.trim() !== ""), z.object({ version: z.string() }))
});
const PackageLockPreV3 = z.object({
	lockfileVersion: z.union([z.literal(2), z.literal(1)]),
	dependencies: LooseRecord(z.object({ version: z.string() }))
}).transform(({ lockfileVersion, dependencies: packages }) => ({
	lockfileVersion,
	packages
}));
const PackageLock = Json.pipe(z.union([PackageLockV3, PackageLockPreV3])).transform(({ packages, lockfileVersion }) => {
	const lockedVersions = {};
	for (const [entry, val] of Object.entries(packages)) lockedVersions[entry] = val.version;
	return {
		lockedVersions,
		lockfileVersion
	};
});
//#endregion
export { PackageJson, PackageLock, PackageLockPreV3, PackageLockV3, PackageManager, PnpmCatalogs, PnpmWorkspaceFile, YarnCatalogs, YarnConfig };

//# sourceMappingURL=schema.js.map