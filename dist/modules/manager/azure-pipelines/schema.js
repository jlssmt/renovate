import { LooseArray, Yaml } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/azure-pipelines/schema.ts
const Step = z.object({ task: z.string() });
const Job = z.object({ steps: LooseArray(Step) });
const Deploy = z.object({
	deploy: Job,
	preDeploy: Job,
	routeTraffic: Job,
	postRouteTraffic: Job,
	on: z.object({
		failure: Job,
		success: Job
	}).partial()
}).partial();
const Deployment = z.object({ strategy: z.object({
	runOnce: Deploy,
	rolling: Deploy,
	canary: Deploy
}).partial() }).partial();
const Jobs = LooseArray(z.union([Job, Deployment]));
const Stage = z.object({ jobs: Jobs });
const Container = z.object({ image: z.string() });
const Repository = z.object({
	type: z.enum([
		"git",
		"github",
		"bitbucket"
	]),
	name: z.string(),
	ref: z.string().optional()
});
const Resources = z.object({
	repositories: LooseArray(Repository),
	containers: LooseArray(Container)
}).partial();
const AzurePipelines = z.object({
	resources: Resources,
	stages: LooseArray(Stage),
	jobs: Jobs,
	steps: LooseArray(Step)
}).partial();
const AzurePipelinesYaml = Yaml.pipe(AzurePipelines);
//#endregion
export { AzurePipelines, AzurePipelinesYaml, Container, Deploy, Deployment, Job, Jobs, Repository, Resources, Stage, Step };

//# sourceMappingURL=schema.js.map