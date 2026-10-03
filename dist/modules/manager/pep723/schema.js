import { coerceArray } from "../../../util/array.js";
import { Toml } from "../../../util/schema-utils/index.js";
import { depTypes, pep508ToPackageDependency } from "../pep621/utils.js";
import { isNonEmptyString } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/manager/pep723/schema.ts
const Pep723Dep = z.string().transform((dep) => pep508ToPackageDependency(depTypes.dependencies, dep));
const Pep723 = Toml.pipe(z.object({
	"requires-python": z.string().optional(),
	dependencies: z.array(Pep723Dep).transform((deps) => deps.filter((dep) => !!dep)).optional()
}).transform(({ "requires-python": requiresPython, dependencies }) => {
	const res = { deps: coerceArray(dependencies) };
	if (isNonEmptyString(requiresPython)) res.extractedConstraints = { python: requiresPython };
	return res;
}));
//#endregion
export { Pep723 };

//# sourceMappingURL=schema.js.map