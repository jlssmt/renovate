import { id } from "../../versioning/semver/index.js";
import { GithubReleasesDatasource } from "../../datasource/github-releases/index.js";
import { GithubTagsDatasource } from "../../datasource/github-tags/index.js";
import { NodeVersionDatasource } from "../../datasource/node-version/index.js";
import { NpmDatasource } from "../../datasource/npm/index.js";
import { RubyVersionDatasource } from "../../datasource/ruby-version/index.js";
import { RustVersionDatasource } from "../../datasource/rust-version/index.js";
//#region lib/modules/manager/proto/upgradeable-tooling.ts
/**
* Maps proto built-in tool names to Renovate datasource configurations.
* @see https://moonrepo.dev/docs/proto/config
*/
const protoTooling = {
	bun: { config: {
		packageName: "oven-sh/bun",
		datasource: GithubReleasesDatasource.id,
		extractVersion: "^bun-v(?<version>\\S+)"
	} },
	deno: { config: {
		packageName: "denoland/deno",
		datasource: GithubReleasesDatasource.id,
		extractVersion: "^v(?<version>\\S+)"
	} },
	gh: { config: {
		packageName: "cli/cli",
		datasource: GithubReleasesDatasource.id,
		extractVersion: "^v(?<version>\\S+)"
	} },
	go: { config: {
		packageName: "golang/go",
		datasource: GithubTagsDatasource.id,
		extractVersion: "^go(?<version>\\S+)"
	} },
	moon: { config: {
		packageName: "moonrepo/moon",
		datasource: GithubReleasesDatasource.id,
		extractVersion: "^v(?<version>\\S+)"
	} },
	node: { config: {
		packageName: "node",
		datasource: NodeVersionDatasource.id
	} },
	npm: { config: {
		packageName: "npm",
		datasource: NpmDatasource.id
	} },
	pnpm: { config: {
		packageName: "pnpm",
		datasource: NpmDatasource.id
	} },
	poetry: { config: {
		packageName: "python-poetry/poetry",
		datasource: GithubReleasesDatasource.id
	} },
	proto: { config: {
		packageName: "moonrepo/proto",
		datasource: GithubReleasesDatasource.id,
		extractVersion: "^v(?<version>\\S+)"
	} },
	python: { config: {
		packageName: "python/cpython",
		datasource: GithubTagsDatasource.id,
		extractVersion: "^v(?<version>\\S+)"
	} },
	ruby: { config: {
		packageName: "ruby-version",
		datasource: RubyVersionDatasource.id,
		versioning: id
	} },
	rust: { config: {
		packageName: "rust",
		datasource: RustVersionDatasource.id
	} },
	uv: { config: {
		packageName: "astral-sh/uv",
		datasource: GithubReleasesDatasource.id
	} },
	yarn: { config: {
		packageName: "@yarnpkg/cli",
		datasource: NpmDatasource.id
	} }
};
//#endregion
export { protoTooling };

//# sourceMappingURL=upgradeable-tooling.js.map