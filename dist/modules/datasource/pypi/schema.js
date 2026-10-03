import { DeepNullish, LooseArray } from "../../../util/schema-utils/index.js";
import { isTruthy } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/datasource/pypi/schema.ts
const PypiRelease = DeepNullish(z.object({
	requires_python: z.string().optional(),
	upload_time: z.string().optional(),
	yanked: z.boolean().optional().default(false)
}));
const PypiResponse = DeepNullish(z.object({
	info: z.object({
		name: z.string().optional(),
		home_page: z.string().optional(),
		project_urls: z.record(z.string(), z.string().optional()).optional()
	}).optional(),
	releases: z.record(z.string(), z.array(PypiRelease)).optional()
}));
const PypiSimpleFile = DeepNullish(z.object({
	filename: z.string(),
	"requires-python": z.string().optional(),
	yanked: z.union([z.boolean(), z.string()]).optional().default(false),
	"upload-time": z.string().optional()
})).transform(({ filename, "requires-python": requires_python, yanked, "upload-time": upload_time }) => ({
	filename,
	requires_python,
	yanked: isTruthy(yanked),
	upload_time
}));
const PypiSimpleResponse = z.object({ files: LooseArray(PypiSimpleFile) });
//#endregion
export { PypiRelease, PypiResponse, PypiSimpleFile, PypiSimpleResponse };

//# sourceMappingURL=schema.js.map