import { BunyanRecord } from "../logger/types.js";
import { GitOperationType } from "../util/git/types.js";
import { BranchCache } from "../util/cache/repository/types.js";
import { PackageFile } from "../modules/manager/types.js";
import { RenovateSplit } from "../config/types.js";
import { Attributes, SpanKind, SpanOptions } from "@opentelemetry/api";
import { ATTR_CODE_FUNCTION_NAME } from "@opentelemetry/semantic-conventions";
//#region lib/instrumentation/types.d.ts
export type RenovateSpanOptions = {
  attributes?: RenovateSpanAttributes;
} & SpanOptions;
export type RenovateSpanAttributes = {
  [ATTR_RENOVATE_SPLIT]?: RenovateSplit;
  [ATTR_VCS_GIT_OPERATION_TYPE]?: GitOperationType;
  [ATTR_CODE_FUNCTION_NAME]?: string;
  [ATTR_RENOVATE_DATASOURCE]?: string;
  [ATTR_RENOVATE_REGISTRY_URL]?: string;
  [ATTR_RENOVATE_PACKAGE_NAME]?: string;
} & Attributes;
/**
 * The instrumentation parameters.
 */
export interface SpanParameters {
  /**
   * The name of the span
   */
  name: string;
  /**
   * Attributes which should be added to the span
   */
  attributes?: RenovateSpanAttributes | undefined;
  /**
   * Should this span be added to the root span or to the current active span
   */
  ignoreParentSpan?: boolean;
  /**
   * Type of span this represents. Default: SpanKind.Internal
   */
  kind?: SpanKind;
}
export interface Report {
  problems: BunyanRecord[];
  repositories: Record<string, RepoReport>;
}
interface RepoReport {
  problems: BunyanRecord[];
  branches: Partial<BranchCache>[];
  packageFiles: Record<string, PackageFile[]>;
  libYearsWithStatus?: LibYearsWithStatus;
}
export interface LibYearsWithStatus {
  libYears: LibYears;
  dependencyStatus: DependencyStatus;
}
export interface LibYears {
  total: number;
  managers: Record<string, number>;
}
export interface DependencyStatus {
  outdated: number;
  total: number;
}
export declare const ATTR_RENOVATE_SPLIT = "renovate.split";
/**
 * The name of a Renovate datasource (ex: `github-tags`, `npm`, `docker`, etc).
 */
export declare const ATTR_RENOVATE_DATASOURCE = "renovate.datasource";
/**
 * The registry URL of a registry URL as might be used with a datasource and package name.
 */
export declare const ATTR_RENOVATE_REGISTRY_URL = "renovate.registryUrl";
/**
 * The package name of a package.
 */
export declare const ATTR_RENOVATE_PACKAGE_NAME = "renovate.packageName";
/**
 * the Git Version Control System (VCS)'s Operation Type
 *
 * @see GitOperationType
 * @see https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/
 *
 */
export declare const ATTR_VCS_GIT_OPERATION_TYPE = "vcs.git.operation.type";
/**
 * the Git Version Control System (VCS)'s subcommand
 *
 * @see https://opentelemetry.io/docs/specs/semconv/registry/attributes/vcs/
 * */
export declare const ATTR_VCS_GIT_SUBCOMMAND = "vcs.git.subcommand";
//#endregion
//# sourceMappingURL=types.d.ts.map