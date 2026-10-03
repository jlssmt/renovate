import { regEx } from "../../../util/regex.js";
import { id } from "../../versioning/semver/index.js";
import { CondaDatasource } from "../../datasource/conda/index.js";
import { CrateDatasource } from "../../datasource/crate/index.js";
import { GitRefsDatasource } from "../../datasource/git-refs/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { GitlabReleasesDatasource } from "../../datasource/gitlab-releases/index.js";
import { GoDatasource } from "../../datasource/go/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { NugetDatasource } from "../../datasource/nuget/index.js";
import { normalizePythonDepName } from "../../datasource/pypi/common.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { RubygemsDatasource } from "../../datasource/rubygems/index.js";
import { isNonEmptyString, isString, isUndefined, isUrlString } from "@sindresorhus/is";
//#region lib/modules/manager/mise/backends.ts
/**
* Create a tooling config for aqua backend
* @link https://mise.jdx.dev/dev-tools/backends/aqua.html
*/
function createAquaToolConfig(name, version) {
	return {
		packageName: name,
		datasource: GithubTagsDatasource.id,
		currentValue: version.replace(regEx(/^v/), ""),
		extractVersion: "^v?(?<version>.+)"
	};
}
const cargoGitVersionRegex = regEx(/^(?<type>tag|branch|rev):(?<version>.+)$/);
/**
* Create a tooling config for cargo backend
* @link https://mise.jdx.dev/dev-tools/backends/cargo.html
*/
function createCargoToolConfig(name, version) {
	if (!isUrlString(name)) return {
		packageName: name,
		datasource: CrateDatasource.id,
		versioning: id
	};
	const matchGroups = cargoGitVersionRegex.exec(version)?.groups;
	if (isUndefined(matchGroups)) return {
		packageName: name,
		skipReason: "invalid-version"
	};
	const { type, version: gitVersion } = matchGroups;
	switch (type) {
		case "tag": return {
			packageName: name,
			datasource: GitTagsDatasource.id,
			currentValue: gitVersion
		};
		case "branch": return {
			packageName: name,
			datasource: GitRefsDatasource.id,
			currentValue: gitVersion
		};
		case "rev": return {
			packageName: name,
			datasource: GitRefsDatasource.id,
			currentValue: gitVersion
		};
	}
}
/**
* Create a tooling config for conda backend
* @link https://mise.jdx.dev/dev-tools/backends/conda.html
*/
function createCondaToolConfig(name) {
	return {
		packageName: name,
		datasource: CondaDatasource.id
	};
}
/**
* Create a tooling config for dotnet backend
* @link https://mise.jdx.dev/dev-tools/backends/dotnet.html
*/
function createDotnetToolConfig(name) {
	return {
		packageName: name,
		datasource: NugetDatasource.id
	};
}
/**
* Create a tooling config for gem backend
* @link https://mise.jdx.dev/dev-tools/backends/gem.html
*/
function createGemToolConfig(name) {
	return {
		packageName: name,
		datasource: RubygemsDatasource.id
	};
}
/**
* Create a tooling config for github backend
* @link https://mise.jdx.dev/dev-tools/backends/github.html
*/
function createGithubToolConfig(name, version, toolOptions) {
	let extractVersion = void 0;
	const prefix = toolOptions.version_prefix;
	if (isNonEmptyString(prefix)) extractVersion = `^${RegExp.escape(prefix)}(?<version>.+)`;
	return {
		packageName: name,
		datasource: GithubReleasesDatasource.id,
		currentValue: version,
		...extractVersion && { extractVersion }
	};
}
/**
* Create a tooling config for gitlab backend
* @link https://mise.jdx.dev/dev-tools/backends/gitlab.html
*/
function createGitlabToolConfig(name, version, toolOptions) {
	let extractVersion = void 0;
	const prefix = toolOptions.version_prefix;
	if (isNonEmptyString(prefix)) extractVersion = `^${RegExp.escape(prefix)}(?<version>.+)`;
	return {
		packageName: name,
		datasource: GitlabReleasesDatasource.id,
		currentValue: version,
		...extractVersion && { extractVersion }
	};
}
/**
* Create a tooling config for go backend
* @link https://mise.jdx.dev/dev-tools/backends/go.html
*/
function createGoToolConfig(name) {
	return {
		packageName: name,
		datasource: GoDatasource.id
	};
}
/**
* Create a tooling config for npm backend
* @link https://mise.jdx.dev/dev-tools/backends/npm.html
*/
function createNpmToolConfig(name) {
	return {
		packageName: name,
		datasource: NpmDatasource.id
	};
}
const pythonPackageGitHubRegex = regEx(/^git\+https:\/\/github\.com\/(?<repo>.+)\.git$/);
/**
* Create a tooling config for the pipx and pypi backends, which share the same tool name syntax
* @link https://mise.jdx.dev/dev-tools/backends/pipx.html
* @link https://mise.jdx.dev/dev-tools/backends/pypi.html
*/
function createPythonPackageToolConfig(name) {
	const isGitSyntax = name.startsWith("git+");
	if (!isGitSyntax && isUrlString(name)) return {
		packageName: name,
		skipReason: "unsupported-url"
	};
	if (isGitSyntax || name.includes("/")) {
		let repoName;
		if (isGitSyntax) {
			repoName = pythonPackageGitHubRegex.exec(name)?.groups?.repo;
			if (isUndefined(repoName)) return {
				packageName: name.replace(regEx(/^git\+/g), "").replaceAll(regEx(/\.git$/g), ""),
				datasource: GitRefsDatasource.id
			};
		} else repoName = name;
		return {
			packageName: repoName,
			datasource: GithubTagsDatasource.id
		};
	}
	return {
		packageName: normalizePythonDepName(name),
		datasource: PypiDatasource.id
	};
}
/**
* Create a tooling config for pipx backend
* @link https://mise.jdx.dev/dev-tools/backends/pipx.html
*/
function createPipxToolConfig(name) {
	return createPythonPackageToolConfig(name);
}
/**
* Create a tooling config for pypi backend
* @link https://mise.jdx.dev/dev-tools/backends/pypi.html
*/
function createPypiToolConfig(name) {
	return createPythonPackageToolConfig(name);
}
const spmGitHubRegex = regEx(/^https:\/\/github.com\/(?<repo>.+).git$/);
/**
* Create a tooling config for spm backend
* @link https://mise.jdx.dev/dev-tools/backends/spm.html
*/
function createSpmToolConfig(name) {
	let repoName;
	if (isUrlString(name)) {
		repoName = spmGitHubRegex.exec(name)?.groups?.repo;
		if (!repoName) return {
			packageName: name,
			skipReason: "unsupported-url"
		};
	}
	return {
		packageName: repoName ?? name,
		datasource: GithubReleasesDatasource.id
	};
}
/**
* Create a tooling config for ubi backend
* @link https://mise.jdx.dev/dev-tools/backends/ubi.html
*/
function createUbiToolConfig(name, version, toolOptions) {
	let extractVersion = void 0;
	const hasVPrefix = version.startsWith("v");
	if (!hasVPrefix || isString(toolOptions.tag_regex)) {
		let tagRegex = ".+";
		if (isString(toolOptions.tag_regex)) {
			tagRegex = toolOptions.tag_regex.replace(regEx(/^\^/), "");
			if (!hasVPrefix) tagRegex = tagRegex.replace(regEx(/^v\??/), "");
		}
		extractVersion = `^${hasVPrefix ? "" : "v?"}(?<version>${tagRegex})`;
	}
	return {
		packageName: name,
		datasource: GithubReleasesDatasource.id,
		currentValue: version,
		...isString(extractVersion) ? { extractVersion } : {}
	};
}
//#endregion
export { createAquaToolConfig, createCargoToolConfig, createCondaToolConfig, createDotnetToolConfig, createGemToolConfig, createGithubToolConfig, createGitlabToolConfig, createGoToolConfig, createNpmToolConfig, createPipxToolConfig, createPypiToolConfig, createSpmToolConfig, createUbiToolConfig };

//# sourceMappingURL=backends.js.map