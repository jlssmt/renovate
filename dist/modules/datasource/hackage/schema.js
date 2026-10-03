import { z } from "zod/v4";
//#region lib/modules/datasource/hackage/schema.ts
const VersionStatus = z.enum([
	"normal",
	"deprecated",
	"unpreferred"
]);
const HackagePackageMetadata = z.record(z.string(), VersionStatus);
//#endregion
export { HackagePackageMetadata };

//# sourceMappingURL=schema.js.map