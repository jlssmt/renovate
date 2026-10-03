import { id } from "../../../versioning/docker/index.js";
import { DockerDatasource } from "../../../datasource/docker/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/bazel/rules/oci.ts
const ociRules = ["oci_pull", "_oci_pull"];
const OciTarget = z.object({
	rule: z.enum(ociRules),
	name: z.string(),
	image: z.string(),
	tag: z.string().optional(),
	digest: z.string().optional()
}).transform(({ rule, name, image, tag, digest }) => [{
	datasource: DockerDatasource.id,
	versioning: id,
	depType: rule,
	depName: name,
	packageName: image,
	currentValue: tag,
	currentDigest: digest
}]);
//#endregion
export { OciTarget, ociRules };

//# sourceMappingURL=oci.js.map