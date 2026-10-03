import { VersioningApi } from "../types.js";
declare namespace index_d_exports {
  export { api, api as default, displayName, getSatisfyingVersion, id, isVersion as isValid, isVersion, supportsRanges, urls };
}
export declare const id = "semver-coerced";
export declare const displayName = "Coerced Semantic Versioning";
export declare const urls: string[];
export declare const supportsRanges = false;
declare function getSatisfyingVersion(versions: string[], range: string): string | null;
export declare function isVersion(input: string): boolean;
export declare const api: VersioningApi;
//#endregion
export { api as default, getSatisfyingVersion, index_d_exports, isVersion as isValid };
//# sourceMappingURL=index.d.ts.map