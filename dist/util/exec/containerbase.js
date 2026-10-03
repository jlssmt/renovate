import { get, set } from "../cache/memory/index.js";
import { getEnv } from "../env.js";
import { regEx } from "../regex.js";
import { GlobalConfig } from "../../config/global.js";
import { coerceArray } from "../array.js";
import { logger } from "../../logger/index.js";
import { isString } from "@sindresorhus/is";
import { quote } from "shlex";
//#region lib/util/exec/containerbase.ts
const allToolConfig = {
	apm: {
		datasource: "github-releases",
		packageName: "microsoft/apm",
		versioning: "semver",
		extractVersion: "^v(?<version>.*)$"
	},
	bazelisk: {
		datasource: "github-releases",
		packageName: "bazelbuild/bazelisk",
		versioning: "semver"
	},
	bun: {
		datasource: "github-releases",
		packageName: "oven-sh/bun",
		extractVersion: "^bun-v(?<version>.*)$",
		versioning: "npm"
	},
	bundler: {
		datasource: "rubygems",
		packageName: "bundler",
		versioning: "ruby"
	},
	cocoapods: {
		datasource: "rubygems",
		packageName: "cocoapods",
		versioning: "ruby"
	},
	composer: {
		datasource: "github-releases",
		packageName: "containerbase/composer-prebuild",
		versioning: "composer"
	},
	conan: {
		datasource: "pypi",
		packageName: "conan",
		versioning: "pep440"
	},
	copier: {
		datasource: "pypi",
		packageName: "copier",
		versioning: "pep440"
	},
	corepack: {
		datasource: "npm",
		packageName: "corepack",
		versioning: "npm"
	},
	deno: {
		datasource: "github-releases",
		packageName: "denoland/deno",
		versioning: "deno"
	},
	devbox: {
		datasource: "github-releases",
		packageName: "jetify-com/devbox",
		versioning: "semver"
	},
	dotnet: {
		datasource: "dotnet-version",
		packageName: "dotnet-sdk",
		versioning: "semver"
	},
	erlang: {
		datasource: "github-releases",
		packageName: "containerbase/erlang-prebuild",
		versioning: "semver-coerced"
	},
	elixir: {
		datasource: "github-releases",
		packageName: "elixir-lang/elixir",
		versioning: "semver"
	},
	flux: {
		datasource: "github-releases",
		packageName: "fluxcd/flux2",
		versioning: "semver"
	},
	gh: {
		datasource: "github-releases",
		packageName: "cli/cli",
		versioning: "semver"
	},
	gleam: {
		datasource: "github-releases",
		packageName: "gleam-lang/gleam",
		versioning: "semver"
	},
	golang: {
		datasource: "github-releases",
		packageName: "containerbase/golang-prebuild",
		versioning: "npm"
	},
	gradle: {
		datasource: "gradle-version",
		packageName: "gradle",
		versioning: "gradle"
	},
	hashin: {
		datasource: "pypi",
		packageName: "hashin",
		versioning: "pep440"
	},
	helm: {
		datasource: "github-releases",
		packageName: "helm/helm",
		versioning: "semver"
	},
	helmfile: {
		datasource: "github-releases",
		packageName: "helmfile/helmfile",
		versioning: "semver"
	},
	java: {
		datasource: "java-version",
		packageName: "java?system=true",
		versioning: "npm"
	},
	"java-maven": {
		datasource: "java-version",
		packageName: "java?system=true",
		versioning: "maven"
	},
	jb: {
		datasource: "github-releases",
		packageName: "jsonnet-bundler/jsonnet-bundler",
		versioning: "semver"
	},
	kustomize: {
		datasource: "github-releases",
		packageName: "kubernetes-sigs/kustomize",
		extractVersion: "^kustomize/v(?<version>.*)$",
		versioning: "semver"
	},
	maven: {
		datasource: "github-releases",
		packageName: "containerbase/maven-prebuild",
		versioning: "maven"
	},
	mise: {
		datasource: "github-releases",
		packageName: "jdx/mise",
		versioning: "npm"
	},
	nix: {
		datasource: "github-releases",
		packageName: "containerbase/nix-prebuild",
		versioning: "semver"
	},
	node: {
		datasource: "github-releases",
		packageName: "containerbase/node-prebuild",
		versioning: "node"
	},
	npm: {
		datasource: "npm",
		packageName: "npm",
		versioning: "npm"
	},
	pdm: {
		datasource: "github-releases",
		packageName: "pdm-project/pdm",
		versioning: "semver"
	},
	php: {
		datasource: "github-releases",
		packageName: "containerbase/php-prebuild",
		versioning: "composer"
	},
	"pip-tools": {
		datasource: "pypi",
		packageName: "pip-tools",
		versioning: "pep440"
	},
	pipenv: {
		datasource: "pypi",
		packageName: "pipenv",
		versioning: "pep440"
	},
	pnpm: {
		datasource: "npm",
		packageName: "pnpm",
		versioning: "npm"
	},
	pixi: {
		datasource: "github-releases",
		packageName: "prefix-dev/pixi",
		versioning: "conda",
		extractVersion: "^v(?<version>.*)$"
	},
	poetry: {
		datasource: "pypi",
		packageName: "poetry",
		versioning: "pep440"
	},
	python: {
		datasource: "github-releases",
		packageName: "containerbase/python-prebuild",
		versioning: "python"
	},
	ruby: {
		datasource: "github-releases",
		packageName: "containerbase/ruby-prebuild",
		versioning: "ruby"
	},
	rust: {
		datasource: "rust-version",
		packageName: "rust",
		versioning: "rust-release-channel"
	},
	uv: {
		datasource: "pypi",
		packageName: "uv",
		versioning: "pep440"
	},
	yarn: {
		datasource: "npm",
		packageName: "yarn",
		versioning: "npm"
	},
	"yarn-slim": {
		datasource: "npm",
		packageName: "yarn",
		versioning: "npm"
	},
	dart: {
		datasource: "dart-version",
		packageName: "dart",
		versioning: "npm"
	},
	flutter: {
		datasource: "github-releases",
		packageName: "containerbase/flutter-prebuild",
		versioning: "npm"
	},
	vendir: {
		datasource: "github-releases",
		packageName: "carvel-dev/vendir",
		versioning: "semver"
	}
};
let _getPkgReleases = null;
async function getPkgReleases(toolConfig) {
	_getPkgReleases ??= import("../../modules/datasource/index.js");
	const { getPkgReleases } = await _getPkgReleases;
	return getPkgReleases(toolConfig);
}
function getToolConfig(toolName) {
	return allToolConfig[toolName];
}
function supportsDynamicInstall(toolName) {
	return !!allToolConfig[toolName];
}
function isContainerbase() {
	return !!getEnv().CONTAINERBASE;
}
function isDynamicInstall(toolConstraints) {
	if (GlobalConfig.get("binarySource") !== "install") return false;
	if (!isContainerbase()) {
		logger.debug("Falling back to binarySource=global");
		return false;
	}
	return !toolConstraints || toolConstraints.every((toolConstraint) => supportsDynamicInstall(toolConstraint.toolName));
}
function isStable(version, versioningApi, latest) {
	if (!versioningApi.isStable(version)) return false;
	if (isString(latest) && versioningApi.isGreaterThan(version, latest)) return false;
	return true;
}
async function resolveConstraint(toolConstraint) {
	const { toolName } = toolConstraint;
	const toolConfig = allToolConfig[toolName];
	if (!toolConfig) throw new Error(`Invalid tool to install: ${toolName}`);
	const { get: getVersioning } = await import("../../modules/versioning/index.js");
	const versioning = getVersioning(toolConfig.versioning);
	let constraint = toolConstraint.constraint;
	if (constraint) {
		if (versioning.isValid(constraint)) {
			if (versioning.isSingleVersion(constraint)) return constraint.replace(regEx(/^=+/), "").trim();
		} else {
			logger.warn({
				toolName,
				constraint,
				versioning: toolConfig.versioning
			}, "Invalid tool constraint");
			constraint = void 0;
		}
	}
	const pkgReleases = await getPkgReleases(toolConfig);
	const releases = coerceArray(pkgReleases?.releases);
	if (!releases?.length) {
		logger.warn({ toolConfig }, "No tool releases found.");
		throw new Error("No tool releases found.");
	}
	const matchingReleases = releases.filter((r) => !constraint || versioning.matches(r.version, constraint));
	const stableMatchingVersion = matchingReleases.filter((r) => isStable(r.version, versioning, pkgReleases?.tags?.latest)).pop()?.version;
	if (stableMatchingVersion) {
		logger.debug({
			toolName,
			constraint,
			resolvedVersion: stableMatchingVersion
		}, "Resolved stable matching version");
		return stableMatchingVersion;
	}
	const unstableMatchingVersion = matchingReleases.pop()?.version;
	if (unstableMatchingVersion) {
		logger.debug({
			toolName,
			constraint,
			resolvedVersion: unstableMatchingVersion
		}, "Resolved unstable matching version");
		return unstableMatchingVersion;
	}
	const stableVersion = releases.filter((r) => isStable(r.version, versioning, pkgReleases?.tags?.latest)).pop()?.version;
	if (stableVersion) logger.warn({
		toolName,
		constraint,
		stableVersion
	}, "No matching tool versions found for constraint - using latest stable version");
	const highestVersion = releases.pop().version;
	logger.warn({
		toolName,
		constraint,
		highestVersion
	}, "No matching or stable tool versions found - using an unstable version");
	return highestVersion;
}
async function generateInstallCommands(toolConstraints, memoize = false) {
	const installCommands = [];
	if (toolConstraints?.length) for (const toolConstraint of toolConstraints) {
		const toolVersion = await resolveConstraint(toolConstraint);
		const { toolName } = toolConstraint;
		if (memoize) {
			const cacheKey = `containerbase-installed:${toolName}:${toolVersion}`;
			if (get(cacheKey)) continue;
			set(cacheKey, true);
		}
		const installCommand = `install-tool ${toolName} ${quote(toolVersion)}`;
		installCommands.push(installCommand);
	}
	return installCommands;
}
//#endregion
export { allToolConfig, generateInstallCommands, getToolConfig, isContainerbase, isDynamicInstall, resolveConstraint, supportsDynamicInstall };

//# sourceMappingURL=containerbase.js.map