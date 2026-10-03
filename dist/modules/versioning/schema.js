import { logger } from "../../logger/index.js";
import { api, id } from "./semver-coerced/index.js";
import api$1 from "./api.js";
import { isFunction } from "@sindresorhus/is";
import { z } from "zod/v4";
//#region lib/modules/versioning/schema.ts
const Versioning = z.string().transform((versioningSpec, ctx) => {
	const [versioningName, ...versioningRest] = versioningSpec.split(":");
	let versioning = api$1.get(versioningName);
	if (!versioning) {
		logger.debug(`Versioning: '${versioningSpec}' not found, falling back to ${id}`);
		return api;
	}
	if (isFunction(versioning)) {
		const versioningConfig = versioningRest.length ? versioningRest.join(":") : void 0;
		try {
			versioning = new versioning(versioningConfig);
		} catch (error) {
			ctx.addIssue({
				code: "custom",
				message: `Versioning: '${versioningSpec}' failed to initialize`,
				params: { error }
			});
			return z.NEVER;
		}
	}
	return versioning;
});
//#endregion
export { Versioning };

//# sourceMappingURL=schema.js.map