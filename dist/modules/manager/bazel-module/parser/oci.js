import { DockerDatasource } from "../../../datasource/docker/index.js";
import { ExtensionTagFragment, StringFragment } from "./fragments.js";
import { z } from "zod/v4";
const pullTag = "pull";
const ociExtensionTags = ["pull"];
const RuleToDockerPackageDep = ExtensionTagFragment.extend({
	extension: z.literal("oci"),
	tag: z.literal(pullTag),
	children: z.object({
		name: StringFragment,
		image: StringFragment,
		tag: StringFragment.optional(),
		digest: StringFragment.optional()
	})
}).transform(({ rawString, children: { name, image, tag, digest } }) => ({
	datasource: DockerDatasource.id,
	depType: "oci_pull",
	depName: name.value,
	packageName: image.value,
	currentValue: tag?.value,
	currentDigest: digest?.value,
	replaceString: rawString
}));
//#endregion
export { RuleToDockerPackageDep, ociExtensionTags };

//# sourceMappingURL=oci.js.map