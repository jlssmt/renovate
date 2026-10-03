import "../../../versioning/npm/index.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { actionsVersionsExtractVersion, parsePartialValue, parseValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/github-releases-dynamic.ts
const InstallBinaryWith = z.object({
	repo: z.string(),
	tag: z.string()
}).transform(({ repo, tag }) => [{
	packageName: repo,
	...parseValue(tag)
}]);
const ErlefSetupBeamWith = z.object({
	"otp-version": z.string().optional(),
	"elixir-version": z.string().optional(),
	"gleam-version": z.string().optional(),
	"rebar3-version": z.string().optional()
}).transform(({ "otp-version": otpVersion, "elixir-version": elixirVersion, "gleam-version": gleamVersion, "rebar3-version": rebar3Version }) => {
	const deps = [];
	if (otpVersion) deps.push({
		packageName: "erlang/otp",
		extractVersion: "^OTP-(?<version>.+)$",
		...parseValue(otpVersion)
	});
	if (elixirVersion) deps.push({
		packageName: "elixir-lang/elixir",
		versioning: "npm",
		...parseValue(elixirVersion)
	});
	if (gleamVersion) deps.push({
		packageName: "gleam-lang/gleam",
		versioning: "npm",
		...parseValue(gleamVersion)
	});
	if (rebar3Version) deps.push({
		packageName: "erlang/rebar3",
		versioning: "npm",
		...parseValue(rebar3Version)
	});
	return deps;
});
const MoonrepoSetupToolchainWith = z.object({
	"moon-version": z.string().optional(),
	"proto-version": z.string().optional()
}).transform(({ "moon-version": moonVersion, "proto-version": protoVersion }) => {
	const deps = [];
	if (moonVersion) deps.push({
		packageName: "moonrepo/moon",
		...parseValue(moonVersion)
	});
	if (protoVersion) deps.push({
		packageName: "moonrepo/proto",
		...parseValue(protoVersion)
	});
	return deps;
});
const InstallCrystalWith = z.object({
	crystal: z.string().optional(),
	shards: z.string().optional()
}).transform(({ crystal, shards }) => {
	const deps = [];
	if (crystal) deps.push({
		packageName: "crystal-lang/crystal",
		...parsePartialValue(crystal)
	});
	if (shards) deps.push({
		packageName: "crystal-lang/shards",
		...parsePartialValue(shards)
	});
	return deps;
});
const SetupMinicondaWith = z.object({
	"miniforge-version": z.string().optional(),
	"python-version": z.string().optional()
}).transform(({ "miniforge-version": miniforgeVersion, "python-version": pythonVersion }) => {
	const deps = [];
	if (miniforgeVersion) deps.push({
		datasource: GithubReleasesDatasource.id,
		depName: "miniforge",
		packageName: "conda-forge/miniforge",
		...parseValue(miniforgeVersion)
	});
	if (pythonVersion) deps.push({
		datasource: GithubReleasesDatasource.id,
		depName: "python",
		packageName: "actions/python-versions",
		versioning: "npm",
		extractVersion: actionsVersionsExtractVersion,
		...parseValue(pythonVersion)
	});
	return deps;
});
const TflintWith = z.object({ tflint_version: z.string().optional() }).transform(({ tflint_version: version }) => {
	if (version === "latest") return [{
		currentValue: version,
		depType: "uses-with",
		skipStage: "extract",
		skipReason: "unsupported-version"
	}];
	return [parseValue(version)];
});
const githubReleasesDynamicActions = {
	"conda-incubator/setup-miniconda": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: SetupMinicondaWith
	},
	"crystal-lang/install-crystal": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: InstallCrystalWith
	},
	"erlef/setup-beam": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: ErlefSetupBeamWith
	},
	"jaxxstorm/action-install-gh-release": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: InstallBinaryWith
	},
	"moonrepo/setup-toolchain": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: MoonrepoSetupToolchainWith
	},
	"sigoden/install-binary": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: InstallBinaryWith
	},
	"terraform-linters/setup-tflint": {
		datasource: GithubReleasesDatasource.id,
		depName: "tflint",
		packageName: "terraform-linters/tflint",
		withSchema: TflintWith
	}
};
//#endregion
export { githubReleasesDynamicActions };

//# sourceMappingURL=github-releases-dynamic.js.map