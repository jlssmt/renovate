import { id } from "../../../versioning/docker/index.js";
import { DockerDatasource } from "../../../datasource/docker/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel/rules/docker.ts
const dockerRules = ["container_pull", "_container_pull"];
const DockerTarget = z.object({
	rule: z.enum(dockerRules),
	name: z.string(),
	tag: z.string(),
	digest: z.string(),
	repository: z.string(),
	registry: z.string()
}).transform(({ rule, name, repository, tag, digest, registry }) => [{
	datasource: DockerDatasource.id,
	versioning: id,
	depType: rule,
	depName: name,
	packageName: repository,
	currentValue: tag,
	currentDigest: digest,
	registryUrls: [registry]
}]);
//#endregion
export { DockerTarget, dockerRules };

//# sourceMappingURL=docker.js.map