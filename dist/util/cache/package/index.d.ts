import { AllConfig } from "../../../config/types.js";
import { PackageCacheNamespace } from "./namespaces.js";
import { backend_d_exports, getCacheType as getCacheType$1 } from "./backend.js";
//#region lib/util/cache/package/index.d.ts
export declare function getCacheType(): ReturnType<typeof getCacheType$1>;
export declare function get<T = any>(namespace: PackageCacheNamespace, key: string): Promise<T | undefined>;
/**
 * Set cache value with user-defined TTL overrides.
 */
export declare function set(namespace: PackageCacheNamespace, key: string, value: unknown, hardTtlMinutes: number): Promise<void>;
/**
 * Set cache value ignoring user-defined TTL overrides.
 * This MUST NOT be used outside of cache implementation
 */
export declare function setWithRawTtl(namespace: PackageCacheNamespace, key: string, value: unknown, hardTtlMinutes: number): Promise<void>;
export declare function init(config: AllConfig): Promise<void>;
export declare function cleanup(_config: AllConfig): Promise<void>;
//#endregion
//# sourceMappingURL=index.d.ts.map