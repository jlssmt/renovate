import { regEx } from "../../../util/regex.js";
//#region lib/modules/manager/deno/utils.ts
const denoLandRegex = regEx(/(?:https:\/\/deno.land\/)(?<rawPackageName>[^@\s]+)(?:@(?<currentValue>[^/\s]+))?(?<filePath>\/[^\s]*)?/);
const depValueRegex = regEx(/(?:deno task\s+\w+:[^\s]+)|(?<datasource>\w+):\/?(?<depName>@?[\w.-]+(?:\/[\w.-]+)?)(?:@(?<currentValue>[^\s/]+))?\/?/);
//#endregion
export { denoLandRegex, depValueRegex };

//# sourceMappingURL=utils.js.map