//#region lib/config/types.ts
const allowedStatusCheckStrings = [
	"minimumReleaseAge",
	"mergeConfidence",
	"configValidation",
	"artifactError"
];
const UpdateTypesOptions = [
	"major",
	"minor",
	"patch",
	"pin",
	"digest",
	"pinDigest",
	"lockFileMaintenance",
	"rollback",
	"replacement"
];
//#endregion
export { UpdateTypesOptions, allowedStatusCheckStrings };

//# sourceMappingURL=types.js.map