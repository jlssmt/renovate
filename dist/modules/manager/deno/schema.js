import { regEx } from "../../../util/regex.js";
import { joinUrlParts } from "../../../util/url.js";
import { Json, Jsonc, LooseArray, LooseRecord } from "../../../util/schema-utils/index.js";
import { id, isValid } from "../../versioning/deno/index.js";
import { extractJsrPackageName } from "../../datasource/jsr/util.js";
import { denoLandRegex, depValueRegex } from "./utils.js";
import { z } from "zod/v4";
import validateNpmPackageName from "validate-npm-package-name";
//#region lib/modules/manager/deno/schema.ts
const DenoLock = Json.pipe(z.object({
	version: z.string(),
	specifiers: LooseRecord(z.string()).catch({}),
	redirects: LooseRecord(z.string()).catch({}),
	remote: LooseRecord(z.string()).catch({})
})).transform(({ version, specifiers, redirects, remote }) => {
	const lockedVersions = {};
	for (const [key, val] of Object.entries(specifiers)) {
		const match = regEx(/^(?<lockedVersion>[^_\s]+)/).exec(val);
		if (match?.groups?.lockedVersion) lockedVersions[key] = match.groups.lockedVersion;
	}
	const redirectVersions = {};
	for (const [key, val] of Object.entries(redirects)) redirectVersions[key] = val;
	const remoteVersions = /* @__PURE__ */ new Set();
	for (const key of Object.keys(remote)) remoteVersions.add(key);
	return {
		lockedVersions,
		redirectVersions,
		remoteVersions,
		lockfileVersion: parseInt(version, 10)
	};
});
const DenoDependency = z.object({
	depValue: z.string(),
	depType: z.string()
}).transform(({ depValue, depType }) => {
	const denoLandMatch = denoLandRegex.exec(depValue);
	if (denoLandMatch?.groups?.rawPackageName) return {
		datasource: "deno",
		depType,
		depName: joinUrlParts("https://deno.land", denoLandMatch.groups.rawPackageName),
		currentValue: denoLandMatch.groups.currentValue,
		currentRawValue: denoLandMatch[0]
	};
	const match = depValueRegex.exec(depValue);
	if (match?.groups?.datasource && match?.groups.depName) {
		const datasource = match.groups.datasource;
		const depName = match.groups.depName;
		const currentValue = match.groups.currentValue;
		const currentRawValue = match[0];
		if (datasource === "npm") {
			const dep = {
				datasource,
				versioning: id
			};
			if (depName && !validateNpmPackageName(depName).validForOldPackages) {
				dep.skipReason = "invalid-name";
				return dep;
			}
			if (currentValue && !isValid(currentValue)) {
				dep.skipReason = "invalid-version";
				return dep;
			}
			return {
				...dep,
				depName,
				currentValue,
				depType,
				currentRawValue
			};
		}
		if (datasource === "jsr") {
			const dep = {
				datasource,
				versioning: id
			};
			if (depName && !extractJsrPackageName(depName)) {
				dep.skipReason = "invalid-name";
				return dep;
			}
			if (currentValue && !isValid(currentValue)) {
				dep.skipReason = "invalid-version";
				return dep;
			}
			return {
				...dep,
				depName,
				currentValue,
				depType,
				currentRawValue
			};
		}
	}
	return {
		depType,
		depName: depValue,
		skipStage: "extract",
		skipReason: "unsupported"
	};
});
const Imports = LooseRecord(z.string()).catch({}).transform((imports) => Object.values(imports).map((depValue) => ({
	depValue,
	depType: "imports"
}))).pipe(z.array(DenoDependency));
const Scopes = LooseRecord(LooseRecord(z.string())).catch({}).transform((scopes) => Object.values(scopes).flatMap((scopeDependencies) => Object.values(scopeDependencies).map((depValue) => ({
	depValue,
	depType: "scopes"
})))).pipe(z.array(DenoDependency));
/**
* dependency in `tasks` can't sync lock file updating due to `deno install` is not supported
*/
const Tasks = LooseRecord(z.union([z.string().transform((depValue) => ({
	depValue,
	depType: "tasks"
})), z.object({ command: z.string() }).transform(({ command }) => ({
	depValue: command,
	depType: "tasks.command"
}))])).catch({}).transform((tasks) => Object.values(tasks).map(({ depValue, depType }) => ({
	depValue,
	depType
}))).pipe(z.array(DenoDependency));
const CompilerOptionsTypes = LooseArray(z.string()).catch([]).transform((types) => types.map((depValue) => ({
	depValue,
	depType: "compilerOptions.types"
}))).pipe(z.array(DenoDependency));
const CompilerOptionsJsxImportSource = z.union([z.string().transform((depValue) => [{
	depValue,
	depType: "compilerOptions.jsxImportSource"
}]), z.undefined().transform(() => [])]).pipe(z.array(DenoDependency));
const CompilerOptionsJsxImportSourceTypes = z.union([z.string().transform((depValue) => [{
	depValue,
	depType: "compilerOptions.jsxImportSourceTypes"
}]), z.undefined().transform(() => [])]).pipe(z.array(DenoDependency));
const Lint = z.object({ plugins: LooseArray(z.string()).catch([]) }).transform((lint) => lint.plugins.map((depValue) => ({
	depValue,
	depType: "lint.plugins"
}))).pipe(z.array(DenoDependency));
const Lock = z.union([
	z.string().transform((path) => path),
	z.boolean().transform((enabled) => enabled && "deno.lock"),
	z.object({ path: z.string().optional() }).transform((obj) => obj.path)
]);
const Workspace = z.union([z.array(z.string()).transform((workspaces) => workspaces), z.object({ members: z.array(z.string()) }).transform((workspace) => workspace.members)]);
const DenoPackageFile = z.object({
	lock: z.optional(Lock),
	workspace: z.optional(Workspace),
	importMap: z.string().optional(),
	imports: z.optional(Imports).default([]),
	scopes: z.optional(Scopes).default([]),
	tasks: z.optional(Tasks).default([]),
	compilerOptions: z.optional(z.object({
		types: CompilerOptionsTypes,
		jsxImportSource: CompilerOptionsJsxImportSource.optional().default([]),
		jsxImportSourceTypes: CompilerOptionsJsxImportSourceTypes.optional().default([])
	})).default({
		types: [],
		jsxImportSource: [],
		jsxImportSourceTypes: []
	}),
	lint: z.optional(Lint).default([])
}).transform(({ lock, imports, scopes, tasks, compilerOptions, lint, importMap, workspace }) => ({
	lock,
	importMap,
	managerData: { workspaces: workspace },
	dependencies: [
		...imports,
		...scopes,
		...tasks,
		...compilerOptions.types,
		...compilerOptions.jsxImportSource,
		...compilerOptions.jsxImportSourceTypes,
		...lint
	]
}));
const DenoExtract = z.object({
	content: Jsonc.pipe(DenoPackageFile),
	fileName: z.string()
});
const ImportMapExtract = Json.pipe(z.object({
	imports: z.optional(Imports).default([]),
	scopes: z.optional(Scopes).default([])
})).transform(({ imports, scopes }) => ({ dependencies: [...imports, ...scopes] }));
const UpdateDenoJsonFile = Jsonc.pipe(z.object({
	imports: z.record(z.string(), z.string()).optional(),
	scopes: z.record(z.string(), z.record(z.string(), z.string())).optional(),
	tasks: z.record(z.string(), z.union([z.string(), z.object({ command: z.string().optional() }).passthrough()])).optional(),
	compilerOptions: z.object({
		types: z.array(z.string()).optional(),
		jsxImportSource: z.string().optional(),
		jsxImportSourceTypes: z.string().optional()
	}).passthrough().optional(),
	lint: z.object({ plugins: z.array(z.string()).optional() }).passthrough().optional()
}).passthrough());
const UpdateImportMapJsonFile = Json.pipe(z.object({
	imports: z.record(z.string(), z.string()).optional(),
	scopes: z.record(z.string(), z.record(z.string(), z.string())).optional()
}).passthrough());
//#endregion
export { CompilerOptionsJsxImportSource, CompilerOptionsJsxImportSourceTypes, CompilerOptionsTypes, DenoDependency, DenoExtract, DenoLock, ImportMapExtract, Imports, Lint, Lock, Scopes, Tasks, UpdateDenoJsonFile, UpdateImportMapJsonFile, Workspace };

//# sourceMappingURL=schema.js.map