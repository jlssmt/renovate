import { toArray } from "../../../util/array.js";
import { LooseArray } from "../../../util/schema-utils/index.js";
import { GitlabTagsDatasource } from "../../datasource/gitlab-tags/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/gitlabci-include/schema.ts
const GitlabInclude = z.object({
	project: z.string(),
	ref: z.string().optional().catch(void 0)
}).transform(({ project, ref }) => {
	const dep = {
		datasource: GitlabTagsDatasource.id,
		depName: project,
		depType: "repository"
	};
	if (!ref) {
		dep.skipReason = "unspecified-version";
		return dep;
	}
	dep.currentValue = ref;
	return dep;
});
const GitlabIncludes = z.union([GitlabInclude.transform(toArray), LooseArray(GitlabInclude)]).catch([]);
const GitlabRecord = z.record(z.string(), z.unknown()).transform((obj) => {
	const { include, ...rest } = obj;
	return {
		include,
		children: Object.values(rest)
	};
});
const GitlabDocument = z.union([GitlabRecord.transform(toArray), LooseArray(GitlabRecord)]).transform((docs) => docs.map(({ include, children }) => {
	const deps = GitlabIncludes.parse(include);
	return [...GitlabDocumentArray.parse(children), ...deps];
}).flat());
const GitlabDocumentArray = LooseArray(GitlabDocument).transform((x) => x.flat()).catch([]);
//#endregion
export { GitlabDocument, GitlabDocumentArray };

//# sourceMappingURL=schema.js.map