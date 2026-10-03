import { LooseArray, LooseRecord, Yaml, withDebugMessage } from "../../../util/schema-utils/index.js";
import { actionSchema } from "./known-actions/utils.js";
import { knownActions } from "./known-actions.js";
import { z } from "zod/v4";
//#region lib/modules/manager/github-actions/schema.ts
const UsesStep = z.object({
	uses: z.string(),
	with: LooseRecord(z.union([z.string(), z.number().transform((s) => s.toString())]))
});
const ParallelStep = z.object({ parallel: LooseArray(z.lazy(() => Step)) }).transform(({ parallel }) => parallel.flat());
const Step = z.union([UsesStep.transform((step) => [step]), ParallelStep]);
const Steps = LooseArray(Step).transform((groups) => groups.flat());
const WorkFlowJobs = z.object({ jobs: LooseRecord(z.object({
	container: z.union([z.string(), z.object({ image: z.string() }).transform((v) => v.image)]).optional().catch(void 0),
	services: LooseRecord(z.union([z.object({ image: z.string() }).transform((v) => v.image), z.string()])).catch({}).transform((services) => Object.values(services)),
	"runs-on": z.union([z.string().transform((v) => [v]), z.array(z.string())]).catch([]),
	steps: Steps.catch([])
})) });
const Actions = z.object({ runs: z.object({
	using: z.string(),
	steps: Steps.optional().catch([])
}) });
const Workflow = Yaml.pipe(z.union([
	WorkFlowJobs,
	Actions,
	z.null()
])).catch(withDebugMessage(null, "Does not match schema"));
/**
* The `actions.lock` schema is owned by the `gh actions-lock` CLI, and is still unstable, so don't rely on the structure too heavily.
*
* `workflows` is deliberately required: if the tool renames or reshapes it, we want the parse to fail so that we stop touching the lockfile, rather than silently treating every workflow as un-onboarded.
*
* TODO #45191: pin to a version of the schema, once it is v1
*/
const ActionsLockfile = Yaml.pipe(z.object({ workflows: z.record(z.string(), z.unknown()) }));
const CommunityActions = z.union(Object.entries(knownActions).map(([name, cfg]) => actionSchema(name, cfg)));
//#endregion
export { ActionsLockfile, CommunityActions, Workflow };

//# sourceMappingURL=schema.js.map