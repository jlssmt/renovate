import { getEnv } from "../../../util/env.js";
import { coerceArray } from "../../../util/array.js";
import { logger } from "../../../logger/index.js";
import { LooseArray, LooseRecord, Toml, withDepType } from "../../../util/schema-utils/index.js";
import { id, isValid } from "../../versioning/pep440/index.js";
import "../../versioning/git/index.js";
import { id as id$1, isValid as isValid$1 } from "../../versioning/poetry/index.js";
import { parseGitUrl } from "../../../util/git/url.js";
import { uniq } from "../../../util/uniq.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { depTypes, pep508ToPackageDependency } from "../pep621/utils.js";
import { DependencyGroup, ProjectSection } from "../pep621/schema.js";
import { z } from "zod/v4";
import merge from "deepmerge";
//#region lib/modules/manager/poetry/schema.ts
const PoetryOptionalDependencyMixin = z.object({ optional: z.boolean().optional().catch(false) }).transform(({ optional }) => optional ? { depType: "extras" } : {});
const PoetryPathDependency = z.object({
	path: z.string(),
	version: z.string().optional().catch(void 0)
}).transform(({ version }) => {
	const dep = {
		datasource: PypiDatasource.id,
		skipReason: "path-dependency"
	};
	if (version) dep.currentValue = version;
	return dep;
}).and(PoetryOptionalDependencyMixin);
const PoetryGitDependency = z.object({
	git: z.string(),
	tag: z.string().optional().catch(void 0),
	version: z.string().optional().catch(void 0),
	branch: z.string().optional().catch(void 0),
	rev: z.string().optional().catch(void 0)
}).transform(({ git, tag, version, branch, rev }) => {
	if (tag) {
		const { source, owner, name } = parseGitUrl(git);
		const repo = `${owner}/${name}`;
		if (source === "github.com") return {
			datasource: GithubTagsDatasource.id,
			currentValue: tag,
			packageName: repo
		};
		if (source === "gitlab.com") return {
			datasource: GitlabTagsDatasource.id,
			currentValue: tag,
			packageName: repo
		};
		return {
			datasource: GitTagsDatasource.id,
			currentValue: tag,
			packageName: git
		};
	}
	if (rev) return {
		datasource: GitRefsDatasource.id,
		currentValue: branch,
		currentDigest: rev,
		replaceString: rev,
		packageName: git
	};
	return {
		datasource: GitRefsDatasource.id,
		currentValue: version,
		packageName: git,
		skipReason: "git-dependency"
	};
}).and(PoetryOptionalDependencyMixin);
const PoetryPypiDependency = z.union([z.object({
	version: z.string().optional(),
	source: z.string().optional()
}).transform(({ version: currentValue, source }) => {
	const managerData = source ? { sourceName: source.toLowerCase() } : {};
	if (!currentValue) return {
		datasource: PypiDatasource.id,
		managerData
	};
	return {
		datasource: PypiDatasource.id,
		managerData: {
			...managerData,
			nestedVersion: true
		},
		currentValue
	};
}).and(PoetryOptionalDependencyMixin), z.string().transform((version) => ({
	datasource: PypiDatasource.id,
	currentValue: version,
	managerData: { nestedVersion: false }
}))]);
const PoetryArrayDependency = z.array(z.unknown()).transform(() => ({
	datasource: PypiDatasource.id,
	skipReason: "multiple-constraint-dep"
}));
const PoetryDependency = z.union([
	PoetryPathDependency,
	PoetryGitDependency,
	PoetryPypiDependency,
	PoetryArrayDependency
]);
const PoetryDependencies = LooseRecord(z.string(), PoetryDependency.transform((dep) => {
	if (dep.skipReason) return dep;
	if (dep.datasource === GitRefsDatasource.id && dep.currentDigest) {
		dep.versioning = "git";
		return dep;
	}
	// istanbul ignore if: normaly should not happen
	if (!dep.currentValue) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	if (isValid(dep.currentValue)) {
		dep.versioning = id;
		return dep;
	}
	if (isValid$1(dep.currentValue)) {
		dep.versioning = id$1;
		return dep;
	}
	dep.skipReason = "invalid-version";
	return dep;
})).transform((record) => {
	const deps = [];
	for (const [depName, dep] of Object.entries(record)) {
		dep.depName = depName;
		if (!dep.packageName) {
			const packageName = normalizePythonDepName(depName);
			if (depName !== packageName) dep.packageName = packageName;
		}
		deps.push(dep);
	}
	return deps;
});
const PoetryGroupDependencies = LooseRecord(z.string(), z.object({ dependencies: PoetryDependencies }).transform(({ dependencies }) => dependencies)).transform((record) => {
	const deps = [];
	for (const [name, val] of Object.entries(record)) for (const dep of Object.values(val)) {
		dep.depType = name;
		deps.push(dep);
	}
	return deps;
});
const PoetrySourceOrder = [
	"default",
	"primary",
	"secondary",
	"supplemental",
	"explicit"
];
const PoetrySource = z.object({
	name: z.string().toLowerCase(),
	url: z.string().optional(),
	priority: z.enum(PoetrySourceOrder).default("primary")
});
const PoetrySources = LooseArray(PoetrySource, { onError: ({ error: err }) => {
	logger.debug({ err }, "Poetry: error parsing sources array");
} }).transform((sources) => {
	const pypiUrl = getEnv().PIP_INDEX_URL ?? "https://pypi.org/pypi/";
	const result = [];
	let overridesPyPi = false;
	let hasDefaultSource = false;
	let hasPrimarySource = false;
	for (const source of sources) {
		if (source.name === "pypi") {
			source.url = pypiUrl;
			overridesPyPi = true;
		}
		if (!source.url) continue;
		if (source.priority === "default") hasDefaultSource = true;
		else if (source.priority === "primary") hasPrimarySource = true;
		result.push(source);
	}
	if (sources.length && !hasDefaultSource && !overridesPyPi) result.push({
		name: "pypi",
		priority: hasPrimarySource ? "secondary" : "default",
		url: pypiUrl
	});
	result.sort((a, b) => PoetrySourceOrder.indexOf(a.priority) - PoetrySourceOrder.indexOf(b.priority));
	return result;
}).catch([]);
const PoetrySection = z.object({
	version: z.string().optional().catch(void 0),
	dependencies: withDepType(PoetryDependencies, "dependencies", false).optional(),
	"dev-dependencies": withDepType(PoetryDependencies, "dev-dependencies").optional(),
	group: PoetryGroupDependencies.optional(),
	source: PoetrySources
});
const BuildSystemRequires = LooseArray(z.string().nonempty().transform((val) => pep508ToPackageDependency(depTypes.buildSystemRequires, val)).refine((dep) => dep !== null)).catch([]);
const PoetryPyProject = Toml.pipe(z.object({
	project: ProjectSection.optional().catch(void 0),
	tool: z.object({ poetry: PoetrySection }).optional().catch(void 0),
	"dependency-groups": DependencyGroup(depTypes.dependencyGroups).catch([]),
	"build-system": z.object({
		"build-backend": z.string().refine((buildBackend) => buildBackend === "poetry.masonry.api" || buildBackend === "poetry.core.masonry.api"),
		requires: BuildSystemRequires
	}).transform(({ requires }) => {
		return {
			poetryRequirement: requires.find(({ depName }) => depName === "poetry" || depName === "poetry_core" || depName === "poetry-core")?.currentValue,
			requires
		};
	}).optional().catch(void 0)
}).transform((pyproject) => {
	const { project, tool, "build-system": buildSystem, "dependency-groups": dependencyGroups } = pyproject;
	const deps = [];
	const projectDependencies = coerceArray(project?.dependencies);
	const projectOptionalDependencies = coerceArray(project?.["optional-dependencies"]);
	const projectDepsByName = {};
	for (const dep of [
		...projectDependencies,
		...dependencyGroups,
		...projectOptionalDependencies
	]) projectDepsByName[dep.depName] = dep;
	if (buildSystem?.requires) deps.push(...buildSystem.requires);
	const poetryDependencies = coerceArray(tool?.poetry?.dependencies);
	const poetryDevDependencies = coerceArray(tool?.poetry?.["dev-dependencies"]);
	const poetryGroupDependencies = coerceArray(tool?.poetry?.group);
	for (const poetryDep of [
		...poetryDependencies,
		...poetryDevDependencies,
		...poetryGroupDependencies
	]) {
		const depName = poetryDep.depName;
		const projectDep = depName && projectDepsByName[depName];
		if (projectDep) {
			const mergedDep = merge(poetryDep, projectDep);
			if (projectDep.currentValue && poetryDep.currentValue) mergedDep.skipReason = "invalid-dependency-specification";
			if (mergedDep.skipReason === "unspecified-version") {
				if (poetryDep.skipReason === "unspecified-version") mergedDep.skipReason = projectDep.skipReason;
				else mergedDep.skipReason = poetryDep.skipReason;
			}
			projectDepsByName[depName] = mergedDep;
		} else deps.push(poetryDep);
	}
	deps.push(...Object.values(projectDepsByName));
	const packageFileContent = {
		deps,
		packageFileVersion: tool?.poetry?.version
	};
	const sourceUrls = tool?.poetry?.source;
	if (sourceUrls) {
		for (const dep of deps) if (dep.managerData?.sourceName) {
			const sourceUrl = sourceUrls.find(({ name }) => name === dep.managerData?.sourceName);
			if (sourceUrl?.url) dep.registryUrls = [sourceUrl.url];
		}
		const sourceUrlsFiltered = sourceUrls.filter(({ priority }) => priority !== "explicit");
		if (sourceUrlsFiltered.length) packageFileContent.registryUrls = uniq(sourceUrlsFiltered.map(({ url }) => url));
	}
	return {
		packageFileContent,
		poetryRequirement: buildSystem?.poetryRequirement
	};
}));
const poetryConstraint = {
	"1.0": "<1.1.0",
	"1.1": "<1.3.0",
	"2.0": ">=1.3.0 <1.4.0"
};
const Lockfile = Toml.pipe(z.object({
	package: LooseArray(z.object({
		name: z.string(),
		version: z.string()
	}).transform(({ name, version }) => [name, version])).transform((entries) => Object.fromEntries(entries)).catch({}),
	metadata: z.object({
		"lock-version": z.string().transform((lockVersion) => poetryConstraint[lockVersion]).optional().catch(void 0),
		"python-versions": z.string().optional().catch(void 0)
	}).transform(({ "lock-version": poetryConstraint, "python-versions": pythonVersions }) => ({
		poetryConstraint,
		pythonVersions
	})).catch({
		poetryConstraint: void 0,
		pythonVersions: void 0
	})
})).transform(({ package: lock, metadata: { poetryConstraint, pythonVersions } }) => ({
	lock,
	poetryConstraint,
	pythonVersions
}));
//#endregion
export { Lockfile, PoetryDependencies, PoetryGroupDependencies, PoetryPyProject, PoetrySection, PoetrySource, PoetrySources };

//# sourceMappingURL=schema.js.map