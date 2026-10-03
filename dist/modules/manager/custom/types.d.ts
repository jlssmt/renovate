import { RegexManagerConfig } from "./regex/types.js";
import { JSONataManagerConfig } from "./jsonata/types.js";
import "./utils.js";
//#region lib/modules/manager/custom/types.d.ts
export interface CustomExtractConfig extends Partial<RegexManagerConfig>, Partial<JSONataManagerConfig> {}
export type CustomManagerName = 'jsonata' | 'regex';
export interface CustomManager extends Partial<RegexManagerConfig>, Partial<JSONataManagerConfig> {
  customType: CustomManagerName;
  managerFilePatterns: string[];
}
//#endregion
//# sourceMappingURL=types.d.ts.map