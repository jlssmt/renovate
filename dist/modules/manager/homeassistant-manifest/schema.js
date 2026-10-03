import { logger } from "../../../logger/index.js";
import { Json, LooseArray } from "../../../util/schema-utils/index.js";
import { PypiDatasource } from "../../datasource/pypi/index.js";
import { extractPackageFile } from "../pip_requirements/extract.js";
import { z } from "zod/v4";
//#region lib/modules/manager/homeassistant-manifest/schema.ts
const Requirement = z.string().transform((requirement) => {
	const dep = extractPackageFile(requirement)?.deps?.[0];
	if (dep) {
		if (!dep.currentValue && !dep.skipReason) dep.skipReason = "unspecified-version";
		return dep;
	}
	logger.debug({ requirement }, "Unable to parse requirement version");
	return {
		depName: requirement,
		datasource: PypiDatasource.id,
		skipReason: "invalid-dependency-specification"
	};
});
const HomeAssistantManifest = Json.pipe(z.object({
	domain: z.string(),
	name: z.string(),
	requirements: LooseArray(Requirement).optional()
})).transform(({ requirements }) => requirements);
//#endregion
export { HomeAssistantManifest };

//# sourceMappingURL=schema.js.map