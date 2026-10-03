import { jsonata_exports } from "./jsonata/index.js";
import { regex_exports } from "./regex/index.js";
//#region lib/modules/manager/custom/api.ts
const api = /* @__PURE__ */ new Map();
api.set("regex", regex_exports);
api.set("jsonata", jsonata_exports);
//#endregion
export { api as default };

//# sourceMappingURL=api.js.map