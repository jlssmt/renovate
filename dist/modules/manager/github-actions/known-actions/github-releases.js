import "../../../versioning/npm/index.js";
import { id } from "../../../versioning/conda/index.js";
import { id as id$1 } from "../../../versioning/node/index.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { actionsVersionsExtractVersion, partialValSchema, valSchema } from "./utils.js";
//#region lib/modules/manager/github-actions/known-actions/github-releases.ts
const githubReleasesActions = {
	"actions/setup-go": {
		datasource: GithubReleasesDatasource.id,
		depName: "go",
		packageName: "actions/go-versions",
		versioning: "npm",
		extractVersion: actionsVersionsExtractVersion,
		withSchema: valSchema("go-version")
	},
	"actions/setup-node": {
		datasource: GithubReleasesDatasource.id,
		depName: "node",
		packageName: "actions/node-versions",
		versioning: id$1,
		extractVersion: actionsVersionsExtractVersion,
		withSchema: valSchema("node-version")
	},
	"actions/setup-python": {
		datasource: GithubReleasesDatasource.id,
		depName: "python",
		packageName: "actions/python-versions",
		versioning: "npm",
		extractVersion: actionsVersionsExtractVersion,
		withSchema: valSchema("python-version")
	},
	"aquaproj/aqua-installer": {
		datasource: GithubReleasesDatasource.id,
		depName: "aqua",
		packageName: "aquaproj/aqua",
		withSchema: valSchema("aqua_version")
	},
	"aquasecurity/setup-trivy": {
		datasource: GithubReleasesDatasource.id,
		packageName: "aquasecurity/trivy"
	},
	"aquasecurity/trivy-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "aquasecurity/trivy"
	},
	"astral-sh/ruff-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "ruff",
		packageName: "astral-sh/ruff"
	},
	"astral-sh/setup-uv": {
		datasource: GithubReleasesDatasource.id,
		versioning: "npm",
		packageName: "astral-sh/uv"
	},
	"azure/setup-helm": {
		datasource: GithubReleasesDatasource.id,
		depName: "helm",
		packageName: "helm/helm"
	},
	"azure/setup-kubectl": {
		datasource: GithubReleasesDatasource.id,
		depName: "kubectl",
		packageName: "kubernetes/kubernetes"
	},
	"bufbuild/buf-setup-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "buf",
		packageName: "bufbuild/buf"
	},
	"cargo-bins/cargo-binstall": {
		datasource: GithubReleasesDatasource.id,
		packageName: "cargo-bins/cargo-binstall",
		extractVersion: "^v(?<version>\\d+\\.\\d+\\.\\d+)$"
	},
	"cue-lang/setup-cue": {
		datasource: GithubReleasesDatasource.id,
		depName: "cue",
		packageName: "cue-lang/cue"
	},
	"dagger/dagger-for-github": {
		datasource: GithubReleasesDatasource.id,
		depName: "dagger",
		packageName: "dagger/dagger",
		extractVersion: "^v(?<version>\\d+\\..*)$"
	},
	"docker/setup-buildx-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "buildx",
		packageName: "docker/buildx"
	},
	"docker/setup-compose-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "docker/compose"
	},
	"docker/setup-docker-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "docker",
		packageName: "moby/moby",
		extractVersion: "^docker-(?<version>.+)$"
	},
	"extractions/setup-just": {
		datasource: GithubReleasesDatasource.id,
		depName: "just",
		packageName: "casey/just",
		withSchema: valSchema("just-version")
	},
	"foundry-rs/foundry-toolchain": {
		datasource: GithubReleasesDatasource.id,
		depName: "foundry",
		packageName: "foundry-rs/foundry"
	},
	"GitTools/actions/gitversion/setup": {
		datasource: GithubReleasesDatasource.id,
		depName: "gitversion",
		packageName: "GitTools/GitVersion",
		versioning: "npm",
		withSchema: valSchema("versionSpec")
	},
	"golangci/golangci-lint-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "golangci/golangci-lint",
		withSchema: partialValSchema("version")
	},
	"goreleaser/goreleaser-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "goreleaser/goreleaser",
		versioning: "npm"
	},
	"hashicorp/setup-packer": {
		datasource: GithubReleasesDatasource.id,
		depName: "packer",
		packageName: "hashicorp/packer"
	},
	"hashicorp/setup-terraform": {
		datasource: GithubReleasesDatasource.id,
		depName: "terraform",
		packageName: "hashicorp/terraform",
		versioning: "npm",
		withSchema: valSchema("terraform_version")
	},
	"helm/chart-releaser-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "chart-releaser",
		packageName: "helm/chart-releaser"
	},
	"helm/chart-testing-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "chart-testing",
		packageName: "helm/chart-testing"
	},
	"j178/prek-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "prek",
		packageName: "j178/prek",
		versioning: "npm",
		withSchema: valSchema("prek-version")
	},
	"jfrog/setup-jfrog-cli": {
		datasource: GithubReleasesDatasource.id,
		depName: "jfrog-cli",
		packageName: "jfrog/jfrog-cli"
	},
	"julia-actions/setup-julia": {
		datasource: GithubReleasesDatasource.id,
		depName: "julia",
		packageName: "JuliaLang/julia",
		versioning: "npm"
	},
	"jwlawson/actions-setup-cmake": {
		datasource: GithubReleasesDatasource.id,
		depName: "cmake",
		packageName: "Kitware/CMake",
		versioning: "npm",
		withSchema: valSchema("cmake-version")
	},
	"mozilla-actions/sccache-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "sccache",
		packageName: "mozilla/sccache"
	},
	"opentofu/setup-opentofu": {
		datasource: GithubReleasesDatasource.id,
		depName: "opentofu",
		packageName: "opentofu/opentofu",
		versioning: "npm",
		withSchema: valSchema("tofu_version")
	},
	"peaceiris/actions-hugo": {
		datasource: GithubReleasesDatasource.id,
		depName: "hugo",
		packageName: "gohugoio/hugo",
		withSchema: valSchema("hugo-version")
	},
	"prefix-dev/setup-pixi": {
		datasource: GithubReleasesDatasource.id,
		versioning: id,
		packageName: "prefix-dev/pixi",
		withSchema: valSchema("pixi-version")
	},
	"pulumi/actions": {
		datasource: GithubReleasesDatasource.id,
		depName: "pulumi",
		packageName: "pulumi/pulumi",
		withSchema: valSchema("pulumi-version")
	},
	"pypa/hatch": {
		datasource: GithubReleasesDatasource.id,
		packageName: "pypa/hatch",
		extractVersion: "^hatch-(?<version>.+)$"
	},
	"raven-actions/actionlint": {
		datasource: GithubReleasesDatasource.id,
		depName: "actionlint",
		packageName: "rhysd/actionlint"
	},
	"reviewdog/action-setup": {
		datasource: GithubReleasesDatasource.id,
		depName: "reviewdog",
		packageName: "reviewdog/reviewdog",
		withSchema: valSchema("reviewdog_version")
	},
	"sigstore/cosign-installer": {
		datasource: GithubReleasesDatasource.id,
		packageName: "sigstore/cosign",
		withSchema: valSchema("cosign-release")
	},
	"stCarolas/setup-maven": {
		datasource: GithubReleasesDatasource.id,
		depName: "maven",
		packageName: "apache/maven",
		extractVersion: "^maven-(?<version>.+)$",
		versioning: "npm",
		withSchema: valSchema("maven-version")
	},
	"subosito/flutter-action": {
		datasource: GithubReleasesDatasource.id,
		depName: "flutter",
		packageName: "flutter/flutter",
		versioning: "npm",
		withSchema: valSchema("flutter-version")
	},
	"superfly/flyctl-actions/setup-flyctl": {
		datasource: GithubReleasesDatasource.id,
		depName: "flyctl",
		packageName: "superfly/flyctl"
	},
	"swift-actions/setup-swift": {
		datasource: GithubReleasesDatasource.id,
		depName: "swift",
		packageName: "swiftlang/swift",
		extractVersion: "^swift-(?<version>.+)-RELEASE$",
		withSchema: partialValSchema("swift-version")
	},
	"UpCloudLtd/upcloud-cli-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "UpCloudLtd/upcloud-cli"
	},
	"WillAbides/setup-go-faster": {
		datasource: GithubReleasesDatasource.id,
		depName: "go",
		packageName: "actions/go-versions",
		versioning: "npm",
		extractVersion: actionsVersionsExtractVersion,
		withSchema: valSchema("go-version")
	}
};
//#endregion
export { githubReleasesActions };

//# sourceMappingURL=github-releases.js.map