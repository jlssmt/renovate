import { DockerDatasource } from "../../../datasource/docker/index.js";
import { parseImageValue, parseValue } from "./utils.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/known-actions/docker-dynamic.ts
const EcsRenderTaskDefinitionWith = z.object({ image: z.string().optional() }).transform(({ image }) => [parseImageValue(image)]);
const renovateGithubActionDefaultImage = "ghcr.io/renovatebot/renovate";
const RenovateGithubActionWith = z.object({
	"renovate-version": z.string().optional(),
	"renovate-image": z.string().optional()
}).transform(({ "renovate-version": version, "renovate-image": image }) => {
	const [packageName, currentDigest] = (image ?? renovateGithubActionDefaultImage).split("@");
	return [{
		packageName,
		...currentDigest ? { currentDigest } : {},
		...parseValue(version)
	}];
});
const dockerDynamicActions = {
	"aws-actions/amazon-ecs-render-task-definition": {
		datasource: DockerDatasource.id,
		packageName: "",
		withSchema: EcsRenderTaskDefinitionWith
	},
	"renovatebot/github-action": {
		datasource: DockerDatasource.id,
		packageName: "",
		withSchema: RenovateGithubActionWith
	}
};
//#endregion
export { dockerDynamicActions };

//# sourceMappingURL=docker-dynamic.js.map