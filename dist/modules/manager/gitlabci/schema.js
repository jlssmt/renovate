import { toArray } from "../../../util/array.js";
import { trimLeadingSlash } from "../../../util/url.js";
import { LooseArray, LooseRecord } from "../../../util/schema-utils/index.js";
import { z } from "zod/v4";
//#region lib/modules/manager/gitlabci/schema.ts
const LocalInclude = z.union([z.string(), z.object({ local: z.string() }).transform(({ local }) => local)]).transform(trimLeadingSlash);
const DocumentLocalIncludes = z.object({ include: z.union([LooseArray(LocalInclude), LocalInclude.transform(toArray)]) }).transform(({ include }) => include);
const MultiDocumentLocalIncludes = LooseArray(DocumentLocalIncludes).transform((includes) => includes.flat());
const Job = z.object({
	image: z.union([z.string().transform((image) => ({
		type: "image",
		value: image
	})), z.object({ name: z.string() }).transform(({ name }) => ({
		type: "image-name",
		value: name
	}))]).optional().catch(void 0),
	services: LooseArray(z.union([z.string(), z.object({ name: z.string() }).transform(({ name }) => name)])).catch([])
});
const Jobs = LooseRecord(z.string(), Job).catch({}).transform((x) => Object.values(x));
const GitlabInclude = z.object({ component: z.string() }).transform(({ component }) => component);
const GitlabIncludes = z.union([LooseArray(GitlabInclude), GitlabInclude.transform(toArray)]).catch([]);
const GitlabDocument = z.record(z.string(), z.unknown()).transform((obj) => {
	const { include, ...rest } = obj;
	return {
		include,
		children: Object.values(rest)
	};
}).transform(({ include, children }) => [...GitlabDocumentArray.parse(children), ...GitlabIncludes.parse(include)]);
const GitlabDocumentArray = LooseArray(GitlabDocument).transform((x) => x.flat());
//#endregion
export { GitlabDocument, Job, Jobs, MultiDocumentLocalIncludes };

//# sourceMappingURL=schema.js.map