import { regEx } from "../../../util/regex.js";
regEx(/^\s*(?<key>[^\s]+):\s+"?(?<value>[^"\s]+)"?\s*$/);
const fileTestRegex = regEx(/\s*apiVersion:\s*'?"?argoproj.io\//);
//#endregion
export { fileTestRegex };

//# sourceMappingURL=util.js.map