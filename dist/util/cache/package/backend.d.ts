import { AllConfig } from "../../../config/types.js";
import { PackageCacheNamespace } from "./namespaces.js";
declare namespace backend_d_exports {
  export { destroy, get, getCacheType, init, set };
}
declare let cacheType: 'redis' | 'sqlite' | 'file' | undefined;
export declare function getCacheType(): typeof cacheType;
export declare function init(config: AllConfig): Promise<void>;
export declare function get<T = unknown>(namespace: PackageCacheNamespace, key: string): Promise<T | undefined>;
export declare function set(namespace: PackageCacheNamespace, key: string, value: unknown, hardTtlMinutes: number): Promise<void>;
export declare function destroy(): Promise<void>;
//#endregion
export { backend_d_exports };
//# sourceMappingURL=backend.d.ts.map