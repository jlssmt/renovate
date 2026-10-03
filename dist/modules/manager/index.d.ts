import { RangeStrategy } from "../../types/versioning.js";
import { MaybePromise } from "../../types/index.js";
import { ExtractConfig, GlobalManagerConfig, ManagerApi, PackageFile, PackageFileContent, RangeConfig } from "./types.js";
import { hashMap } from "./fingerprint.generated.js";
//#region lib/modules/manager/index.d.ts
export declare function getManagerList(): string[];
export declare function getManagers(): Map<string, ManagerApi>;
export declare const allManagersList: string[];
export declare function get<T extends keyof ManagerApi>(manager: string, name: T): ManagerApi[T] | undefined;
export declare function detectAllGlobalConfig(): Promise<GlobalManagerConfig>;
export declare function extractAllPackageFiles(manager: string, config: ExtractConfig, files: string[]): Promise<PackageFile[] | null>;
export declare function extractPackageFile(manager: string, content: string, fileName: string, config: ExtractConfig): MaybePromise<PackageFileContent | null>;
export declare function getRangeStrategy(config: RangeConfig): RangeStrategy | null;
export declare function getPrettyDepType(manager: string, depType: string): string | undefined;
export declare function isKnownManager(mgr: string): boolean;
/**
 * Filter a list of managers based on enabled managers.
 *
 * If enabledManagers is provided, this function returns a subset of allManagersList
 * that matches the enabled manager names, including custom managers. If enabledManagers
 * is not provided or is an empty array, it returns the full list of managers.
 */
export declare function getEnabledManagersList(enabledManagers?: string[]): string[];
//#endregion
export { hashMap };
//# sourceMappingURL=index.d.ts.map