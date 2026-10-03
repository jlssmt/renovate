import { MatchStringsStrategy } from "../../../../config/types.js";
//#region lib/modules/manager/custom/regex/types.d.ts
export interface RegexManagerTemplates {
  depNameTemplate?: string;
  packageNameTemplate?: string;
  datasourceTemplate?: string;
  versioningTemplate?: string;
  depTypeTemplate?: string;
  currentValueTemplate?: string;
  currentDigestTemplate?: string;
  extractVersionTemplate?: string;
  registryUrlTemplate?: string;
}
export interface RegexManagerConfig extends RegexManagerTemplates {
  matchStrings: string[];
  matchStringsStrategy?: MatchStringsStrategy;
  autoReplaceStringTemplate?: string;
}
//#endregion
//# sourceMappingURL=types.d.ts.map