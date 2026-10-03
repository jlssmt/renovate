import { UtcDate } from "../../../util/schema-utils/index.js";
import { MaybeTimestamp } from "../../../util/timestamp.js";
import { DateTime } from "luxon";
import { z } from "zod/v4";
//#region lib/modules/datasource/endoflife-date/schema.ts
const ExpireableField = z.union([UtcDate.transform((x) => {
	return x <= DateTime.now().toUTC();
}), z.boolean()]);
const EndoflifeDateVersions = z.object({
	cycle: z.string(),
	latest: z.optional(z.string()),
	releaseDate: MaybeTimestamp,
	eol: z.optional(ExpireableField),
	discontinued: z.optional(ExpireableField)
}).transform(({ cycle, latest, releaseDate: releaseTimestamp, eol, discontinued }) => {
	return {
		version: latest ?? cycle,
		releaseTimestamp,
		isDeprecated: eol === true || discontinued === true
	};
}).array();
//#endregion
export { EndoflifeDateVersions };

//# sourceMappingURL=schema.js.map