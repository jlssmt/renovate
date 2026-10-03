import { LooseArray, LooseRecord, Yaml } from "../../../util/schema-utils/index.js";
import { id } from "../../versioning/semver/index.js";
import { GitTagsDatasource } from "../../datasource/git-tags/index.js";
import { getDep } from "../dockerfile/extract.js";
import { z } from "zod/v4";
//#region lib/modules/manager/batect/schema.ts
const BatectConfig = Yaml.pipe(z.object({
	containers: LooseRecord(z.string(), z.object({ image: z.string() }).transform(({ image }) => image)).transform((x) => Object.values(x)).catch([]),
	include: LooseArray(z.union([
		z.object({
			type: z.literal("git"),
			repo: z.string(),
			ref: z.string()
		}),
		z.object({
			type: z.literal("file"),
			path: z.string()
		}),
		z.string().transform((path) => ({
			type: "file",
			path
		}))
	])).catch([])
})).transform(({ containers, include }) => {
	const imageDependencies = containers.map((image) => getDep(image));
	const bundleDependencies = [];
	const fileIncludes = [];
	for (const item of include) if (item.type === "git") bundleDependencies.push({
		depName: item.repo,
		currentValue: item.ref,
		versioning: id,
		datasource: GitTagsDatasource.id,
		commitMessageTopic: "bundle {{depName}}"
	});
	else fileIncludes.push(item.path);
	return {
		imageDependencies,
		bundleDependencies,
		fileIncludes
	};
});
//#endregion
export { BatectConfig };

//# sourceMappingURL=schema.js.map