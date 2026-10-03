import { DistroDataFile, DistroInfoRecord, DistroInfoRecordWithVersion, DistroSchedule, GenericVersion, NewValueConfig, RangeComparator, VersionComparator, VersionParser, VersioningApi, VersioningApiConstructor } from "./types.js";
import { index_d_exports } from "./semver-coerced/index.js";
//#region lib/modules/versioning/index.d.ts
export declare const defaultVersioning: typeof index_d_exports;
export declare function getVersioningList(): string[];
/**
 * Get versioning map. Can be used to dynamically add new versioning type
 */
export declare function getVersionings(): Map<string, VersioningApi | VersioningApiConstructor>;
export declare function get(versioning: string | null | undefined): VersioningApi;
//#endregion
export { DistroDataFile, DistroInfoRecord, DistroInfoRecordWithVersion, DistroSchedule, GenericVersion, NewValueConfig, RangeComparator, VersionComparator, VersionParser, VersioningApi, VersioningApiConstructor };
//# sourceMappingURL=index.d.ts.map