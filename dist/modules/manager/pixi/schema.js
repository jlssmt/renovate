import { regEx } from "../../../util/regex.js";
import { LooseRecord, Toml, Yaml } from "../../../util/schema-utils/index.js";
import { id } from "../../versioning/pep440/index.js";
import { id as id$1 } from "../../versioning/conda/index.js";
import "../../versioning/git/index.js";
import { CondaDatasource } from "../../datasource/conda/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { PyProject } from "../pep621/schema.js";
import { z } from "zod/v4";
//#region lib/modules/manager/pixi/schema.ts
const Channel = z.union([z.string(), z.object({
	channel: z.string(),
	priority: z.number().optional(),
	"exclude-newer": z.string().optional()
})]);
function collectNamedPackages(packages) {
	return Object.entries(packages).map(([depName, config]) => {
		return {
			...config,
			depName
		};
	});
}
const PypiDependency = z.union([z.string().transform((version) => ({ version })), z.object({ version: z.string() })]).transform(({ version }) => {
	const dep = {
		currentValue: version,
		versioning: id,
		datasource: PypiDatasource.id
	};
	if (version.startsWith("==")) dep.currentVersion = version.replace(regEx(/^==\s*/), "");
	return dep;
});
const PypiGitDependency = z.object({
	git: z.string(),
	rev: z.optional(z.string())
}).transform(({ git, rev }) => {
	if (!rev) return {
		currentValue: rev,
		packageName: git,
		datasource: GitRefsDatasource.id,
		versioning: "git",
		skipStage: "extract",
		skipReason: "unspecified-version"
	};
	return {
		currentValue: rev,
		packageName: git,
		datasource: GitRefsDatasource.id,
		versioning: "git"
	};
});
const PypiDependencies = LooseRecord(z.string(), z.union([PypiDependency, PypiGitDependency])).transform(collectNamedPackages);
const CondaDependency = z.union([z.string().transform((version) => ({
	version,
	channel: void 0
})), z.object({
	version: z.string(),
	channel: z.optional(z.string())
})]).transform(({ version, channel }) => {
	return {
		currentValue: version,
		versioning: id$1,
		datasource: CondaDatasource.id,
		channel
	};
});
const CondaDependencies = LooseRecord(z.string(), CondaDependency).transform(collectNamedPackages);
const Targets = LooseRecord(z.string(), z.object({
	dependencies: z.optional(CondaDependencies).default([]),
	"pypi-dependencies": z.optional(PypiDependencies).default([])
})).transform((val) => {
	const conda = [];
	const pypi = [];
	for (const value of Object.values(val)) {
		pypi.push(...value["pypi-dependencies"]);
		conda.push(...value.dependencies);
	}
	return {
		pypi,
		conda
	};
});
const Project = z.object({
	channels: z.array(Channel).default([]),
	"requires-pixi": z.string().optional(),
	"channel-priority": z.union([z.literal("strict"), z.literal("disabled")]).default("strict")
});
const DependenciesMixin = z.object({
	dependencies: z.optional(CondaDependencies).default([]),
	"pypi-dependencies": z.optional(PypiDependencies).default([]),
	target: z.optional(Targets).default({
		pypi: [],
		conda: []
	})
}).transform((val) => {
	return {
		conda: [...val.dependencies, ...val.target.conda],
		pypi: [...val["pypi-dependencies"], ...val.target.pypi]
	};
});
const Features = LooseRecord(z.string(), z.object({ channels: z.array(Channel).optional() }).and(DependenciesMixin)).transform((features) => {
	const pypi = [];
	const conda = [];
	for (const [name, feature] of Object.entries(features)) {
		conda.push(...feature.conda.map((item) => {
			return {
				...item,
				depType: `feature-${name}`,
				channels: feature.channels
			};
		}));
		pypi.push(...feature.pypi.map((item) => ({
			depType: `feature-${name}`,
			...item
		})));
	}
	return {
		pypi,
		conda
	};
});
const PixiWorkspace = z.object({ workspace: Project }).transform((val) => {
	return { project: val.workspace };
});
const PixiProject = z.object({ project: Project });
/**
* `$` of `pixi.toml` or `$.tool.pixi` of `pyproject.toml`
*/
const PixiConfig = z.union([PixiWorkspace, PixiProject]).and(z.object({ feature: Features.default({
	pypi: [],
	conda: []
}) })).and(DependenciesMixin);
const PixiFile = Toml.pipe(PixiConfig);
const PixiPyProject = Toml.pipe(PyProject.extend({ tool: z.object({ pixi: PixiConfig.optional().catch(void 0) }).optional().catch(void 0) }));
Yaml.pipe(z.object({ version: z.number() }));
//#endregion
export { PixiConfig, PixiFile, PixiPyProject };

//# sourceMappingURL=schema.js.map