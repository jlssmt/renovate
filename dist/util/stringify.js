import { configure } from "safe-stable-stringify";
//#region lib/util/stringify.ts
const quickStringify = configure({ deterministic: false });
const safeStringify = configure({ deterministic: true });
//#endregion
export { quickStringify, safeStringify };

//# sourceMappingURL=stringify.js.map