import { Toml, withDepType } from "../../../util/schema-utils/index.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { applyGitSource } from "../util.js";
import { z } from "zod/v4";
//#region lib/modules/manager/cargo/schema.ts
const CargoDep = z.union([z.object({
	/** Path on disk to the crate sources */
	path: z.string().optional(),
	/** Git URL for the dependency */
	git: z.string().optional(),
	/** Git tag for the dependency */
	tag: z.string().optional(),
	/** Git revision for the dependency */
	rev: z.string().optional(),
	/** Git branch for the dependency */
	branch: z.string().optional(),
	/** Semver version */
	version: z.string().optional(),
	/** Name of a registry whose URL is configured in `.cargo/config.toml` or `.cargo/config` */
	registry: z.string().optional(),
	/** Name of a package to look up */
	package: z.string().optional(),
	/** Whether the dependency is inherited from the workspace */
	workspace: z.boolean().optional()
}).transform(({ path, git, tag, rev, branch, version, registry, package: pkg, workspace }) => {
	let skipReason;
	let currentValue;
	let nestedVersion = false;
	if (version) {
		currentValue = version;
		nestedVersion = true;
	} else currentValue = "";
	const dep = {
		currentValue,
		managerData: { nestedVersion },
		datasource: CrateDatasource.id
	};
	if (path) skipReason = "path-dependency";
	else if (workspace) skipReason = "inherited-dependency";
	else if (git) applyGitSource(dep, git, rev, tag, branch);
	else if (!version) skipReason = "invalid-dependency-specification";
	if (skipReason) dep.skipReason = skipReason;
	if (pkg && !git) dep.packageName = pkg;
	if (registry) dep.managerData.registryName = registry;
	return dep;
}), z.string().transform((version) => ({
	currentValue: version,
	managerData: { nestedVersion: false },
	datasource: CrateDatasource.id
}))]);
const CargoDeps = z.record(z.string(), CargoDep).transform((record) => {
	const deps = [];
	for (const [depName, dep] of Object.entries(record)) {
		dep.depName = depName;
		deps.push(dep);
	}
	return deps;
});
const CargoSection = z.object({
	dependencies: withDepType(CargoDeps, "dependencies").optional(),
	"dev-dependencies": withDepType(CargoDeps, "dev-dependencies").optional(),
	"build-dependencies": withDepType(CargoDeps, "build-dependencies").optional()
});
const CargoWorkspace = z.object({
	dependencies: withDepType(CargoDeps, "workspace.dependencies").optional(),
	package: z.object({ version: z.string().optional() }).optional()
});
const CargoTarget = z.record(z.string(), CargoSection);
const CargoManifest = Toml.pipe(CargoSection.extend({
	package: z.object({ version: z.union([z.string(), z.object({ workspace: z.literal(true) })]).optional() }).optional(),
	workspace: CargoWorkspace.optional(),
	target: CargoTarget.optional()
}));
const CargoConfigRegistry = z.object({ index: z.string().optional() });
const CargoConfigSource = z.object({
	"replace-with": z.string().optional(),
	registry: z.string().optional()
});
const CargoConfig = Toml.pipe(z.object({
	registries: z.record(z.string(), CargoConfigRegistry).optional(),
	source: z.record(z.string(), CargoConfigSource).optional()
}));
const CargoLockPackage = z.object({
	name: z.string(),
	version: z.string(),
	source: z.string().optional()
});
const CargoLock = Toml.pipe(z.object({ package: z.array(CargoLockPackage).optional() }));
//#endregion
export { CargoConfig, CargoLock, CargoManifest };

//# sourceMappingURL=schema.js.map