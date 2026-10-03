import { PackageJson } from "type-fest";
//#region lib/types/base.d.ts
export interface ModuleApi {
  displayName?: string;
  url?: string;
  /** optional URLs to add to docs as references */
  urls?: string[];
}
export type RenovatePackageJson = PackageJson & {
  version: string;
};
//#endregion
//# sourceMappingURL=base.d.ts.map