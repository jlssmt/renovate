import { DockerDatasource } from "../../../datasource/docker/index.js";
import { GithubReleasesDatasource } from "../../../datasource/github-releases/index.js";
import { JavaVersionDatasource } from "../../../datasource/java-version/index.js";
import { NodeVersionDatasource } from "../../../datasource/node-version/index.js";
import { NpmDatasource } from "../../../datasource/npm/index.js";
import { parseImageValue, parseValue } from "./utils.js";
import { parseJavaVersion } from "./java-version-dynamic.js";
import { DATASOURCE_DETERMINED_DYNAMICALLY } from "../types.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/multiple.ts
const KindActionWith = z.object({
	version: z.string().optional(),
	node_image: z.string().optional(),
	kubectl_version: z.string().optional()
}).transform(({ version, node_image, kubectl_version }) => {
	const deps = [];
	if (version) deps.push({
		packageName: "kubernetes-sigs/kind",
		...parseValue(version)
	});
	if (node_image) deps.push({
		datasource: DockerDatasource.id,
		...parseImageValue(node_image)
	});
	if (kubectl_version) deps.push({
		packageName: "kubernetes/kubernetes",
		...parseValue(kubectl_version)
	});
	return deps;
});
const GraalvmSetupWith = z.object({
	"java-version": z.string().optional(),
	version: z.string().optional()
}).transform(({ "java-version": javaVersion, version }) => {
	const deps = [];
	if (javaVersion) deps.push({
		datasource: JavaVersionDatasource.id,
		packageName: "java-jdk",
		...parseJavaVersion(javaVersion)
	});
	if (version) deps.push({
		datasource: GithubReleasesDatasource.id,
		packageName: "graalvm/graalvm-ce-builds",
		extractVersion: "^(?:jdk|graal)-(?<version>.+)$",
		...parseValue(version)
	});
	return deps;
});
const pnpmRuntimes = {
	node: {
		datasource: NodeVersionDatasource.id,
		packageName: "node"
	},
	bun: {
		datasource: NpmDatasource.id,
		packageName: "bun"
	},
	deno: {
		datasource: NpmDatasource.id,
		packageName: "deno"
	}
};
function parsePnpmRuntime(runtime) {
	if (!runtime) return [];
	const [name, version] = runtime.split("@");
	const cfg = pnpmRuntimes[name];
	if (!cfg) return [{
		packageName: name || runtime,
		depType: "uses-with",
		skipStage: "extract",
		skipReason: "invalid-name"
	}];
	return [{
		...cfg,
		...parseValue(version)
	}];
}
const PnpmSetupWith = z.object({
	version: z.string().optional(),
	runtime: z.string().optional()
}).transform(({ version, runtime }) => [parseValue(version), ...parsePnpmRuntime(runtime)]);
/**
* Entries whose emitted dependencies span more than one datasource, so no
* single-datasource file (or its structural "same datasource" test) applies.
*/
const multipleActions = {
	"graalvm/setup-graalvm": {
		datasource: DATASOURCE_DETERMINED_DYNAMICALLY,
		packageName: "",
		withSchema: GraalvmSetupWith
	},
	"helm/kind-action": {
		datasource: GithubReleasesDatasource.id,
		packageName: "",
		withSchema: KindActionWith
	},
	"pnpm/setup": {
		datasource: NpmDatasource.id,
		packageName: "pnpm",
		withSchema: PnpmSetupWith
	}
};
//#endregion
export { multipleActions };

//# sourceMappingURL=multiple.js.map