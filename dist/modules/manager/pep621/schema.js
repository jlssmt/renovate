import { LooseArray, LooseRecord, Toml } from "../../../util/schema-utils/index.js";
import { api } from "../../versioning/pep440/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { depTypes, pep508ToPackageDependency } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/pep621/schema.ts
function Pep508Dependency(depType) {
	return z.string().transform((x, ctx) => {
		const res = pep508ToPackageDependency(depType, x);
		if (!res) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "should be a valid PEP508 dependency",
				fatal: true
			});
			return z.NEVER;
		}
		return res;
	});
}
function DependencyGroup(depType) {
	return LooseRecord(LooseArray(Pep508Dependency(depType))).transform((depGroups) => {
		const deps = [];
		for (const [depGroup, groupDeps] of Object.entries(depGroups)) for (const dep of groupDeps) {
			// v8 ignore else -- the parser always sets a package name on a group dep
			if (dep.packageName) dep.depName = dep.packageName;
			dep.managerData = { depGroup };
			deps.push(dep);
		}
		return deps;
	});
}
const PdmConfig = z.object({
	"dev-dependencies": DependencyGroup(depTypes.pdmDevDependencies).catch([]),
	source: LooseArray(z.object({
		url: z.string(),
		name: z.string()
	})).transform((pdmSource) => {
		const registryUrls = [];
		let containsPyPiUrl = false;
		for (const source of pdmSource) {
			if (source.name === "pypi") containsPyPiUrl = true;
			registryUrls.push(source.url);
		}
		if (!containsPyPiUrl) registryUrls.unshift(PypiDatasource.defaultURL);
		return registryUrls;
	}).optional().catch(void 0)
}).transform(({ "dev-dependencies": devDependencies, source: registryUrls }) => ({
	devDependencies,
	registryUrls
}));
const HatchConfig = z.object({ envs: LooseRecord(z.string(), z.object({
	dependencies: z.unknown().optional(),
	"extra-dependencies": z.unknown().optional()
})) }).catch({ envs: {} }).transform(({ envs }) => {
	const deps = [];
	for (const [envName, { dependencies, "extra-dependencies": extraDependencies }] of Object.entries(envs)) {
		const depType = `tool.hatch.envs.${envName}`;
		const HatchDependency = LooseArray(Pep508Dependency(depType)).catch([]);
		deps.push(...HatchDependency.parse(dependencies), ...HatchDependency.parse(extraDependencies));
	}
	return { deps };
});
const UvIndexSource = z.object({ index: z.string() });
const UvGitSource = z.object({
	git: z.string(),
	rev: z.string().optional(),
	tag: z.string().optional(),
	branch: z.string().optional()
});
const UvUrlSource = z.object({ url: z.string() });
const UvPathSource = z.object({ path: z.string() });
const UvWorkspaceSource = z.object({ workspace: z.literal(true) });
const UvSource = z.union([
	UvIndexSource,
	UvGitSource,
	UvUrlSource,
	UvPathSource,
	UvWorkspaceSource
]);
const UvSources = z.union([UvSource, z.array(UvSource).min(1)]).transform((source) => Array.isArray(source) ? source : [source]);
const UvConfig = z.object({
	"dev-dependencies": LooseArray(Pep508Dependency(depTypes.uvDevDependencies)).catch([]),
	"required-version": z.string().optional(),
	sources: LooseRecord(z.string().transform((source) => normalizePythonDepName(source)), UvSources).optional(),
	index: z.array(z.object({
		name: z.string().optional(),
		url: z.string(),
		default: z.boolean().default(false),
		explicit: z.boolean().default(false)
	})).optional()
});
const ProjectSection = z.object({
	version: z.string().optional().catch(void 0),
	"requires-python": z.string().optional().catch(void 0),
	dependencies: LooseArray(Pep508Dependency(depTypes.dependencies)).catch([]),
	"optional-dependencies": DependencyGroup(depTypes.optionalDependencies).catch([])
});
const PixiMinimalConfig = z.object({
	project: z.object({ "requires-pixi": z.string().optional() }).optional().catch(void 0),
	workspace: z.object({ "requires-pixi": z.string().optional() }).optional().catch(void 0)
}).transform((val) => ({ 
/* v8 ignore start: needs a pixi manifest declaring the requirement only under workspace */
"requires-pixi": val.project?.["requires-pixi"] ?? val.workspace?.["requires-pixi"] })).optional().catch(void 0);
const PyProject = z.object({
	project: ProjectSection.optional().catch(void 0),
	"build-system": z.object({
		requires: LooseArray(Pep508Dependency(depTypes.buildSystemRequires)).catch([]),
		"build-backend": z.string().optional().catch(void 0)
	}).optional().catch(void 0),
	"dependency-groups": DependencyGroup(depTypes.dependencyGroups).catch([]),
	tool: z.object({
		pdm: PdmConfig.optional().catch(void 0),
		hatch: HatchConfig.optional().catch(void 0),
		uv: UvConfig.optional().catch(void 0),
		pixi: PixiMinimalConfig
	}).optional().catch(void 0)
});
const PdmLockfile = Toml.pipe(z.object({ package: LooseArray(z.object({
	name: z.string(),
	version: z.string()
})) })).transform(({ package: pkg }) => Object.fromEntries(pkg.map(({ name, version }) => [name, version]))).transform((lock) => ({ lock }));
const UvLockfile = Toml.pipe(z.object({ package: LooseArray(z.object({
	name: z.string(),
	version: z.string()
})) })).transform(({ package: pkgs }) => {
	const pkgMap = {};
	for (const { name, version } of pkgs) if (!(name in pkgMap) || api.isGreaterThan(pkgMap[name], version)) pkgMap[name] = version;
	return pkgMap;
});
//#endregion
export { DependencyGroup, PdmLockfile, ProjectSection, PyProject, UvLockfile };

//# sourceMappingURL=schema.js.map