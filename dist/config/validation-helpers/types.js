//#region lib/config/validation-helpers/types.ts
/**
* Known `topic`s for Config Validation errors.
*
* This is particularly important for `Security`, which callers use to decide that a violation must always fail validation.
*/
const ConfigValidationTopic = {
	Error: "Configuration Error",
	Warning: "Configuration Warning",
	Deprecation: "Deprecation Warning",
	Security: "Config security error"
};
//#endregion
export { ConfigValidationTopic };

//# sourceMappingURL=types.js.map