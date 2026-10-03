import { asTimestamp } from "../../../util/timestamp.js";
import { z } from "zod/v4";
//#region lib/modules/datasource/elm-package/schema.ts
/**
* Response from package.elm-lang.org/packages/{author}/{package}/releases.json
* Maps version strings to Unix timestamps
*/
const ElmPackageReleases = z.record(z.string(), z.number()).refine((obj) => Object.keys(obj).length > 0, "No releases found").transform((releases) => {
	return { releases: Object.entries(releases).map(([version, timestamp]) => ({
		version,
		releaseTimestamp: asTimestamp(timestamp)
	})) };
});
//#endregion
export { ElmPackageReleases };

//# sourceMappingURL=schema.js.map