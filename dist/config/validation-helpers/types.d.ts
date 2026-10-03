import "../types.js";
//#region lib/config/validation-helpers/types.d.ts
/**
 * Known `topic`s for Config Validation errors.
 *
 * This is particularly important for `Security`, which callers use to decide that a violation must always fail validation.
 */
export declare const ConfigValidationTopic: {
  readonly Error: 'Configuration Error';
  readonly Warning: 'Configuration Warning';
  readonly Deprecation: 'Deprecation Warning';
  readonly Security: 'Config security error';
};
export type ConfigValidationTopic = (typeof ConfigValidationTopic)[keyof typeof ConfigValidationTopic];
//#endregion
//# sourceMappingURL=types.d.ts.map