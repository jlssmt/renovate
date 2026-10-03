import { DatasourceApi, DigestConfig, GetDigestInputConfig, GetPkgReleasesConfig, GetReleasesConfig, PostprocessReleaseConfig, PostprocessReleaseResult, RegistryStrategy, Release, ReleaseResult, ReleaseTags, SourceUrlSupport } from "./types.js";
import { AsyncResult } from "../../util/result.js";
import { isGetPkgReleasesConfig } from "./common.js";
//#region lib/modules/datasource/index.d.ts
export declare function getDatasources(): Map<string, DatasourceApi>;
export declare function getDatasourceList(): string[];
export declare function getRawPkgReleases(config: GetPkgReleasesConfig): AsyncResult<ReleaseResult, Error | 'no-datasource' | 'no-package-name' | 'no-result'>;
export declare function applyDatasourceFilters(releaseResult: ReleaseResult, config: GetPkgReleasesConfig): ReleaseResult;
export declare function getPkgReleases(config: GetPkgReleasesConfig): Promise<ReleaseResult | null>;
export declare function supportsDigests(datasource: string | undefined): boolean;
export declare function getDigest(config: GetDigestInputConfig, value?: string): Promise<string | null>;
export declare function getDefaultConfig(datasource: string): Promise<Record<string, unknown>>;
//#endregion
export { DatasourceApi, DigestConfig, GetDigestInputConfig, GetPkgReleasesConfig, GetReleasesConfig, PostprocessReleaseConfig, PostprocessReleaseResult, RegistryStrategy, Release, ReleaseResult, ReleaseTags, SourceUrlSupport, isGetPkgReleasesConfig };
//# sourceMappingURL=index.d.ts.map