import { GenericVersion, NewValueConfig, VersioningApi } from "./types.js";
//#region lib/modules/versioning/generic.d.ts
export declare abstract class GenericVersioningApi<T extends GenericVersion = GenericVersion> implements VersioningApi {
  private _getSection;
  protected _compare(version: string, other: string): number;
  protected _compareOther(_left: T, _right: T): number;
  protected abstract _parse(version: string): T | null;
  isValid(version: string): boolean;
  isCompatible(version: string, _current: string): boolean;
  isStable(version: string): boolean;
  isSingleVersion(version: string): boolean;
  isVersion(version: string): boolean;
  getMajor(version: string): number | null;
  getMinor(version: string): number | null;
  getPatch(version: string): number | null;
  equals(version: string, other: string): boolean;
  isGreaterThan(version: string, other: string): boolean;
  isLessThanRange(version: string, range: string): boolean;
  getSatisfyingVersion(versions: string[], range: string): string | null;
  minSatisfyingVersion(versions: string[], range: string): string | null;
  getNewValue({ currentValue, currentVersion, newVersion }: NewValueConfig): string | null;
  sortVersions(version: string, other: string): number;
  matches(version: string, range: string): boolean;
  isSame(type: 'major' | 'minor' | 'patch', a: string, b: string): boolean;
}
//#endregion
//# sourceMappingURL=generic.d.ts.map