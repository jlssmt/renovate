import { DatasourceApi, GetPkgReleasesConfig, ReleaseResult } from "./types.js";
//#region lib/modules/datasource/common.d.ts
export declare function getDatasourceFor(datasource: string): DatasourceApi | null;
export declare function getDefaultVersioning(datasourceName: string | undefined): string;
export declare function isGetPkgReleasesConfig(input: unknown): input is GetPkgReleasesConfig;
export declare function applyVersionCompatibility(releaseResult: ReleaseResult, versionCompatibility: string | undefined, currentCompatibility: string | undefined): ReleaseResult;
export declare function applyExtractVersion(releaseResult: ReleaseResult, extractVersion: string | undefined): ReleaseResult;
export declare function filterValidVersions<Config extends Pick<GetPkgReleasesConfig, 'versioning' | 'datasource'>>(releaseResult: ReleaseResult, config: Config): ReleaseResult;
export declare function sortAndRemoveDuplicates<Config extends Pick<GetPkgReleasesConfig, 'versioning' | 'datasource'>>(releaseResult: ReleaseResult, config: Config): ReleaseResult;
export declare function applyConstraintsFiltering<Config extends Pick<GetPkgReleasesConfig, 'constraintsFiltering' | 'constraintsVersioning' | 'versioning' | 'datasource' | 'constraints' | 'packageName'>>(releaseResult: ReleaseResult, config: Config): ReleaseResult;
//#endregion
//# sourceMappingURL=common.d.ts.map