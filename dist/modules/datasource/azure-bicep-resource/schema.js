import { coerceArray } from "../../../util/array.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/azure-bicep-resource/schema.ts
const BicepResourceVersionIndex = z.object({ resources: z.record(z.string(), z.unknown()) }).transform(({ resources }) => {
	const releaseMap = /* @__PURE__ */ new Map();
	for (const resourceReference of Object.keys(resources)) {
		const [type, version] = resourceReference.toLowerCase().split("@", 2);
		const versions = coerceArray(releaseMap.get(type));
		versions.push(version);
		releaseMap.set(type, versions);
	}
	return Object.fromEntries(releaseMap);
});
//#endregion
export { BicepResourceVersionIndex };

//# sourceMappingURL=schema.js.map