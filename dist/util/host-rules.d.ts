import { CombinedHostRule, HostRule } from "../types/host-rules.js";
import "../types/index.js";
//#region lib/util/host-rules.d.ts
/**
 * Fields within `HostRule`s that must have their value registered for sanitising through `sanitize.addSecretForSanitizing()`.
 *
 * Kept in sync with `redactedFields` through tests.
 */
export declare const confidentialFields: (keyof HostRule)[];
export interface LegacyHostRule {
  hostName?: string;
  domainName?: string;
  baseUrl?: string;
  host?: string;
  endpoint?: string;
}
export declare function migrateRule(rule: LegacyHostRule & HostRule): HostRule;
/**
 * Enforce the `allowedHeaders` allowlist on a set of host rules.
 *
 * Loudly remove anything that's not permitted, logging a WARN.
 *
 * `add()` applies this to every rule it registers, so callers only need it themselves to pre-filter - e.g. to avoid repeating the WARN when the same rules are registered again and again.
 *
 * @param [allowedHeaders] the effective allowlist. Defaults to `GlobalConfig`, but must be passed explicitly when filtering before `GlobalConfig` reflects the repository being processed, i.e. for a `repositories[]` entry's own `allowedHeaders` override
 * @param [warnOnDenied=true] whether to log the WARN. Pass `false` where the very same rules are filtered again, so that it is logged once rather than repeated
 *
 * Headers that survive this allowlist are still subject to how {@link find} combines them: an admin's headers for a host are applied over those of any repository or preset rule matching the same request, so a repository can neither drop nor substitute them.
 */
export declare function filterAllowedHeaders(rules: HostRule[], allowedHeaders?: string[], warnOnDenied?: boolean): HostRule[];
export interface AddHostRuleOptions {
  /** the effective allowlist. Defaults to `GlobalConfig`; pass it explicitly when `GlobalConfig` does not yet reflect the repository the rule is registered for */
  allowedHeaders?: string[];
  /**
   * Whether this rule comes from the self-hosted administrator's own configuration, rather than from repository or preset config.
   *
   * Registers the rule into the `admin` tier - see {@link HostRuleTrustTier}.
   */
  trusted?: boolean;
  /**
   * Whether this rule comes from organization-inherited config which the administrator has opted into trusting, through `inheritConfigTrusted`.
   *
   * Registers the rule into the `inherit` tier - see {@link HostRuleTrustTier}. Ignored when `trusted` is also set.
   */
  inherited?: boolean;
}
export declare function add(params: HostRule, options?: AddHostRuleOptions): void;
export interface HostRuleSearch {
  hostType?: string;
  url?: string;
  readOnly?: boolean;
}
export declare function matchesHost(url: string, matchHost: string): boolean;
export declare function find(search: HostRuleSearch): CombinedHostRule;
export declare function hosts({ hostType }: {
  hostType: string;
}): string[];
export declare function hostType({ url }: {
  url: string;
}): string | null;
export declare function findAll({ hostType }: {
  hostType: string;
}): HostRule[];
/**
 * @returns a deep copy of all known host rules without any filtering
 */
export declare function getAll(): HostRule[];
export declare function clear(): void;
//#endregion
//# sourceMappingURL=host-rules.d.ts.map