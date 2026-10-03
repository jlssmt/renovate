//#region lib/config/options/env-options.d.ts
export interface EnvOptionInfo {
  configName: string;
  globalOnly: boolean;
  inheritConfigSupport: boolean;
  type: string;
}
export type EnvOptionsMap = Record<string, EnvOptionInfo>;
export declare function getEnvOptionsMap(): EnvOptionsMap;
//#endregion
//# sourceMappingURL=env-options.d.ts.map