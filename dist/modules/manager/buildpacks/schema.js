import { Toml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/buildpacks/schema.ts
const BuildpackByName = z.object({
	id: z.string(),
	version: z.string().optional()
});
const BuildpackByURI = z.object({ uri: z.string() });
const BuildpackGroup = BuildpackByName.or(BuildpackByURI);
function isBuildpackByName(group) {
	return "id" in group;
}
function isBuildpackByURI(group) {
	return "uri" in group;
}
const IoBuildpacks = z.object({
	builder: z.string().optional(),
	group: z.array(BuildpackGroup).optional()
});
const ProjectDescriptor = z.object({
	_: z.object({ "schema-version": z.string() }),
	io: z.object({ buildpacks: IoBuildpacks.optional() }).optional()
});
const ProjectDescriptorToml = Toml.pipe(ProjectDescriptor);
//#endregion
export { ProjectDescriptor, ProjectDescriptorToml, isBuildpackByName, isBuildpackByURI };

//# sourceMappingURL=schema.js.map